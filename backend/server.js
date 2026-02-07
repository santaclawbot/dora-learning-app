require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dora-super-secret-key-2024';

// Hardcoded users for MVP - Parent account with child profiles
const USERS = {
  'parent': { 
    id: 1, 
    username: 'parent', 
    password: 'family123', 
    name: 'Parent', 
    avatar: '👨‍👩‍👧‍👦',
    profiles: [
      { id: 'aiden', name: 'Aiden', avatar: '🦁' },
      { id: 'marcus', name: 'Marcus', avatar: '🐻' }
    ]
  },
  // Keep old users for backwards compatibility
  'aiden': { id: 2, username: 'aiden', password: 'aiden123', name: 'Aiden', avatar: '🦁', profiles: [{ id: 'aiden', name: 'Aiden', avatar: '🦁' }] },
  'marcus': { id: 3, username: 'marcus', password: 'marcus123', name: 'Marcus', avatar: '🐻', profiles: [{ id: 'marcus', name: 'Marcus', avatar: '🐻' }] }
};

// ElevenLabs config
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_77718b72529589bb7f4b81b6f6e875436b8238093c3f9009';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Bella - warm female voice

// Anthropic/Claude config for Ask Dora
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// Rate limiting for Ask Dora (20 messages per hour per profile)
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateLimitStore = new Map(); // profileId -> { count, resetAt }

// Database connection
const DB_PATH = process.env.DATABASE_URL || './data/dora.db';

// Ensure data directory exists
const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('📦 Database connected');
    // Auto-initialize database on startup
    initializeDatabase();
  }
});

// Initialize database schema and seed data
function initializeDatabase() {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      email TEXT UNIQUE,
      name TEXT,
      password_hash TEXT,
      profile_pic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Lessons table
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      difficulty TEXT DEFAULT 'Beginner',
      duration_minutes INTEGER,
      thumbnail_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User lesson progress
    CREATE TABLE IF NOT EXISTS user_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      status TEXT DEFAULT 'not_started',
      progress_percent INTEGER DEFAULT 0,
      score INTEGER,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id),
      UNIQUE(user_id, lesson_id)
    );

    -- User responses to exercises
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      question_id INTEGER,
      answer TEXT,
      is_correct BOOLEAN,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id)
    );

    -- Telegram messages log
    CREATE TABLE IF NOT EXISTS telegram_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message_text TEXT,
      message_type TEXT,
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Ask Dora conversations
    CREATE TABLE IF NOT EXISTS dora_conversations (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Ask Dora messages
    CREATE TABLE IF NOT EXISTS dora_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES dora_conversations(id)
    );

    -- Index for faster queries
    CREATE INDEX IF NOT EXISTS idx_dora_messages_conv ON dora_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_dora_conversations_profile ON dora_conversations(profile_id);
  `;

  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Error initializing schema:', err);
    } else {
      console.log('✅ Database schema ready');
      // Seed data and update content
      seedAndUpdateLessons();
    }
  });
}

// Seed lessons if table is empty, then update content
function seedAndUpdateLessons() {
  db.get('SELECT COUNT(*) as count FROM lessons', (err, row) => {
    if (err) {
      console.error('❌ Error checking lessons:', err);
      return;
    }
    
    if (row && row.count === 0) {
      console.log('📝 Seeding initial lessons...');
      const seedLessons = [
        { title: 'Hello! Meet Dora 🌟', description: 'Say hi to Dora and learn about your adventure!', difficulty: 'Easy', duration: 5 },
        { title: 'Colors Are Everywhere! 🌈', description: 'Explore the rainbow with Dora!', difficulty: 'Easy', duration: 8 },
        { title: 'Counting Fun! 🔢', description: 'Count to 10 with Dora!', difficulty: 'Easy', duration: 10 }
      ];
      
      const stmt = db.prepare('INSERT INTO lessons (title, description, difficulty, duration_minutes) VALUES (?, ?, ?, ?)');
      seedLessons.forEach(lesson => {
        stmt.run(lesson.title, lesson.description, lesson.difficulty, lesson.duration);
      });
      stmt.finalize(() => {
        console.log('✅ Lessons seeded');
        updateLessonsContent();
      });
    } else {
      console.log(`📚 Found ${row.count} lessons`);
      updateLessonsContent();
    }
  });
}

// Create audio cache directory
const AUDIO_CACHE_DIR = path.join(__dirname, 'audio-cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}

function updateLessonsContent() {
  const lessons = [
    {
      id: 1,
      title: 'Hello! Meet Dora 🌟',
      description: 'Say hi to Dora and learn about your adventure!',
      content: `Hi there, friend! I'm Dora, and I'm so happy to meet you!

Today we're going to learn together. Are you ready for an adventure?

Learning is like going on a treasure hunt. Every new thing you learn is like finding a shiny gem!

Here's what we'll do:
• Listen to fun stories
• Answer cool questions  
• Collect stars as you learn!

Let's go! Tap the play button to hear me talk to you!`,
      difficulty: 'Easy',
      duration_minutes: 5,
      thumbnail_url: '/images/dora-wave.png'
    },
    {
      id: 2,
      title: 'Colors Are Everywhere! 🌈',
      description: 'Explore the rainbow with Dora!',
      content: `Look around you! Colors are everywhere!

The sky is BLUE like a blueberry.
The sun is YELLOW like a banana.
Grass is GREEN like a frog.
And apples can be RED like a firetruck!

Can you find something blue near you right now? 
How about something yellow?

Colors make our world so beautiful! 
Each color is special, just like you!

Tap the button when you're ready to move on!`,
      difficulty: 'Easy',
      duration_minutes: 8,
      thumbnail_url: '/images/rainbow.png'
    },
    {
      id: 3,
      title: 'Counting Fun! 🔢',
      description: 'Count to 10 with Dora!',
      content: `Let's count together! Ready?

1 - One little star ⭐
2 - Two happy eyes 👀
3 - Three colorful balloons 🎈
4 - Four fluffy clouds ☁️
5 - Five fingers on your hand ✋

Great job! Now let's keep going...

6 - Six bouncy balls
7 - Seven pretty flowers 🌸
8 - Eight busy bees 🐝
9 - Nine yummy cookies 🍪
10 - Ten shiny diamonds! 💎

You did it! You can count to 10!
Give yourself a big hug!`,
      difficulty: 'Easy',
      duration_minutes: 10,
      thumbnail_url: '/images/numbers.png'
    }
  ];

  lessons.forEach(lesson => {
    db.run(
      `UPDATE lessons SET title = ?, description = ?, content = ?, difficulty = ?, duration_minutes = ?, thumbnail_url = ? WHERE id = ?`,
      [lesson.title, lesson.description, lesson.content, lesson.difficulty, lesson.duration_minutes, lesson.thumbnail_url, lesson.id]
    );
  });
  console.log('📚 Lessons content updated');
}

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : '*',
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/audio', express.static(AUDIO_CACHE_DIR));

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ========== AUTH ROUTES ==========

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = USERS[username.toLowerCase()];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Wrong username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      profiles: user.profiles || []
    }
  });
});

// Get available profiles for logged-in user
app.get('/api/profiles', authenticateToken, (req, res) => {
  const user = USERS[req.user.username];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ profiles: user.profiles || [] });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = USERS[req.user.username];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    avatar: user.avatar
  });
});

// ========== LESSON ROUTES ==========

app.get('/api/lessons', (req, res) => {
  db.all('SELECT id, title, description, difficulty, duration_minutes, thumbnail_url FROM lessons ORDER BY id ASC', [], (err, lessons) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ lessons: lessons || [] });
  });
});

app.get('/api/lessons/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM lessons WHERE id = ?', [id], (err, lesson) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  });
});

app.post('/api/lessons/:id/complete', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.run(
    `INSERT OR REPLACE INTO user_lessons (user_id, lesson_id, status, progress_percent, completed_at) 
     VALUES (?, ?, 'completed', 100, CURRENT_TIMESTAMP)`,
    [userId, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, message: 'Lesson completed!' });
    }
  );
});

app.get('/api/progress', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT l.id as lesson_id, l.title, ul.status, ul.progress_percent, ul.completed_at
     FROM user_lessons ul
     JOIN lessons l ON ul.lesson_id = l.id
     WHERE ul.user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ progress: rows || [] });
    }
  );
});

// ========== TTS ROUTES (ElevenLabs) ==========

app.post('/api/tts/generate', authenticateToken, async (req, res) => {
  const { text, lessonId } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Create cache key from lesson ID or text hash
  const cacheKey = lessonId ? `lesson_${lessonId}` : `text_${Buffer.from(text).toString('base64').slice(0, 20)}`;
  const audioPath = path.join(AUDIO_CACHE_DIR, `${cacheKey}.mp3`);

  // Check cache first
  if (fs.existsSync(audioPath)) {
    console.log('🔊 Serving cached audio:', cacheKey);
    return res.json({ 
      audioUrl: `/audio/${cacheKey}.mp3`,
      cached: true 
    });
  }

  try {
    console.log('🎙️ Generating TTS for:', text.substring(0, 50) + '...');
    
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      },
      responseType: 'arraybuffer'
    });

    // Save to cache
    fs.writeFileSync(audioPath, response.data);
    console.log('✅ Audio saved to cache:', audioPath);

    res.json({ 
      audioUrl: `/audio/${cacheKey}.mp3`,
      cached: false 
    });

  } catch (error) {
    console.error('❌ ElevenLabs TTS error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate audio',
      details: error.response?.data?.detail || error.message
    });
  }
});

// Get pre-generated audio for a lesson
app.get('/api/lessons/:id/audio', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const cacheKey = `lesson_${id}`;
  const audioPath = path.join(AUDIO_CACHE_DIR, `${cacheKey}.mp3`);

  // Check cache
  if (fs.existsSync(audioPath)) {
    return res.json({ audioUrl: `/audio/${cacheKey}.mp3`, cached: true });
  }

  // Generate if not cached
  db.get('SELECT content FROM lessons WHERE id = ?', [id], async (err, lesson) => {
    if (err || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    try {
      const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        data: {
          text: lesson.content,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        },
        responseType: 'arraybuffer'
      });

      fs.writeFileSync(audioPath, response.data);
      res.json({ audioUrl: `/audio/${cacheKey}.mp3`, cached: false });

    } catch (error) {
      console.error('❌ TTS error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  });
});

// ========== ASK DORA ROUTES ==========

// Helper: Generate unique ID
function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Helper: Check rate limit
function checkRateLimit(profileId) {
  const now = Date.now();
  let record = rateLimitStore.get(profileId);
  
  if (!record || now >= record.resetAt) {
    record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(profileId, record);
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
    return { allowed: false, minutesLeft };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// Helper: Build Dora system prompt
function buildDoraSystemPrompt(profileName, profileAge) {
  return `You are Dora, a friendly and enthusiastic AI teacher for young children (ages 3-8). 

Rules:
- Use simple words a 5-year-old understands
- Keep responses short (2-4 sentences max)
- Be warm, encouraging, and patient
- Use lots of emojis! 🌟⭐💫
- Always be positive and supportive
- If you don't know something, say "Let's find out together!"
- Never discuss anything inappropriate for children
- Redirect scary/violent topics to something fun

Child's name: ${profileName || 'friend'}
Child's age: ${profileAge || 5}`;
}

// Helper: Get conversation history for Claude context
function getConversationMessages(conversationId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT role, content FROM dora_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Helper: Save message to database
function saveMessage(id, conversationId, role, content) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO dora_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)`,
      [id, conversationId, role, content],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// POST /api/ask-dora/new - Start a new conversation
app.post('/api/ask-dora/new', authenticateToken, (req, res) => {
  const { profileId, profileName } = req.body;
  const userId = req.user.id;
  
  if (!profileId) {
    return res.status(400).json({ success: false, error: 'profileId is required' });
  }
  
  const conversationId = generateId('conv_');
  const title = `Chat with ${profileName || 'Child'}`;
  
  db.run(
    `INSERT INTO dora_conversations (id, profile_id, user_id, title) VALUES (?, ?, ?, ?)`,
    [conversationId, profileId, userId, title],
    (err) => {
      if (err) {
        console.error('❌ Error creating conversation:', err);
        return res.status(500).json({ success: false, error: 'Failed to create conversation' });
      }
      
      res.json({
        success: true,
        conversationId,
        title,
        createdAt: new Date().toISOString()
      });
    }
  );
});

// GET /api/ask-dora/history - Get conversation history
app.get('/api/ask-dora/history', authenticateToken, (req, res) => {
  const { conversationId, profileId } = req.query;
  const userId = req.user.id;
  
  if (conversationId) {
    // Get messages for a specific conversation
    db.get(
      `SELECT * FROM dora_conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId],
      (err, conv) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Database error' });
        }
        if (!conv) {
          return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        
        db.all(
          `SELECT id, role, content, created_at as timestamp FROM dora_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
          [conversationId],
          (err, messages) => {
            if (err) {
              return res.status(500).json({ success: false, error: 'Database error' });
            }
            res.json({
              success: true,
              conversation: {
                id: conv.id,
                title: conv.title,
                profileId: conv.profile_id,
                createdAt: conv.created_at,
                updatedAt: conv.updated_at
              },
              messages: messages || []
            });
          }
        );
      }
    );
  } else if (profileId) {
    // Get all conversations for a profile
    db.all(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM dora_messages WHERE conversation_id = c.id) as messageCount
       FROM dora_conversations c 
       WHERE c.profile_id = ? AND c.user_id = ?
       ORDER BY c.updated_at DESC`,
      [profileId, userId],
      (err, conversations) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({
          success: true,
          conversations: conversations || []
        });
      }
    );
  } else {
    return res.status(400).json({ success: false, error: 'conversationId or profileId is required' });
  }
});

// POST /api/ask-dora/message - Send a message to Dora
app.post('/api/ask-dora/message', authenticateToken, async (req, res) => {
  const { conversationId, message, profileId, profileName, profileAge } = req.body;
  const userId = req.user.id;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }
  
  if (!conversationId) {
    return res.status(400).json({ success: false, error: 'conversationId is required' });
  }
  
  // Check rate limit
  const rateCheck = checkRateLimit(profileId || `user_${userId}`);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many messages! Please wait ${rateCheck.minutesLeft} minutes before asking Dora more questions. 🌟`,
      retryAfterMinutes: rateCheck.minutesLeft
    });
  }
  
  // Verify conversation exists and belongs to user
  db.get(
    `SELECT * FROM dora_conversations WHERE id = ? AND user_id = ?`,
    [conversationId, userId],
    async (err, conv) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      if (!conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      
      try {
        // Save user message
        const userMsgId = generateId('msg_');
        await saveMessage(userMsgId, conversationId, 'user', message.trim());
        
        // Get conversation history for context
        const history = await getConversationMessages(conversationId);
        
        // Build messages for Claude
        const claudeMessages = history.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));
        
        let responseText;
        let source = 'claude-direct';
        
        if (anthropic) {
          // Call Claude API
          const systemPrompt = buildDoraSystemPrompt(profileName, profileAge);
          
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: systemPrompt,
            messages: claudeMessages
          });
          
          responseText = response.content[0].text;
        } else {
          // Fallback response if no API key
          source = 'fallback';
          responseText = `Hi ${profileName || 'friend'}! 🌟 I'm having a little trouble right now, but I'll be back soon! Try asking me again later, okay? 💫`;
        }
        
        // Save Dora's response
        const doraMsgId = generateId('msg_');
        await saveMessage(doraMsgId, conversationId, 'assistant', responseText);
        
        // Update conversation timestamp
        db.run(
          `UPDATE dora_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [conversationId]
        );
        
        res.json({
          success: true,
          response: {
            id: doraMsgId,
            text: responseText,
            timestamp: new Date().toISOString()
          },
          conversationId,
          source,
          rateLimit: {
            remaining: rateCheck.remaining,
            limit: RATE_LIMIT_MAX
          }
        });
        
      } catch (error) {
        console.error('❌ Ask Dora error:', error);
        res.status(500).json({
          success: false,
          error: 'Oops! Something went wrong. Let\'s try again! 🌈'
        });
      }
    }
  );
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dora Backend running on http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🎙️  ElevenLabs TTS: ${ELEVENLABS_API_KEY ? 'Configured' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  db.close();
  process.exit(0);
});

module.exports = app;

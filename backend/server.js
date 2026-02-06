require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dora-super-secret-key-2024';

// Hardcoded users for MVP
const USERS = {
  'aiden': { id: 1, username: 'aiden', password: 'aiden123', name: 'Aiden', avatar: '🦁' },
  'marcus': { id: 2, username: 'marcus', password: 'marcus123', name: 'Marcus', avatar: '🐻' }
};

// ElevenLabs config
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_77718b72529589bb7f4b81b6f6e875436b8238093c3f9009';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Bella - warm female voice

// Database connection
const DB_PATH = process.env.DATABASE_URL || './data/dora.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('📦 Database connected');
    // Update lessons with fun content
    updateLessonsContent();
  }
});

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

// Middleware
app.use(cors());
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
      avatar: user.avatar
    }
  });
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

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Database connection
const DB_PATH = process.env.DATABASE_URL || './data/dora.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('📦 Database connected');
  }
});

// Telegram Bot Setup
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (TELEGRAM_TOKEN) {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log('🤖 Telegram bot initialized (polling mode)');
  
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name || 'friend';
    
    // Register user if new
    db.run(
      `INSERT OR IGNORE INTO users (telegram_id, name) VALUES (?, ?)`,
      [String(chatId), username]
    );
    
    const welcomeMessage = `
🎓 *Welcome to Dora Learning App, ${username}!*

I'm your personal learning assistant. Here's what I can help you with:

📚 /lessons - Browse available lessons
📊 /progress - Check your learning progress
❓ /help - Get help and support

Ready to start learning? Tap a button below!
    `;
    
    bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📚 Browse Lessons', callback_data: 'browse_lessons' }],
          [{ text: '🚀 Quick Start', callback_data: 'quick_start' }],
          [{ text: '📊 My Progress', callback_data: 'my_progress' }]
        ]
      }
    });
    
    logMessage(chatId, msg.text, 'command', 'welcome_sent');
  });

  // /lessons command
  bot.onText(/\/lessons/, async (msg) => {
    const chatId = msg.chat.id;
    sendLessonsList(chatId);
  });

  // /progress command
  bot.onText(/\/progress/, async (msg) => {
    const chatId = msg.chat.id;
    
    db.get(
      `SELECT u.id, u.name FROM users u WHERE u.telegram_id = ?`,
      [String(chatId)],
      (err, user) => {
        if (err || !user) {
          bot.sendMessage(chatId, '❌ Please /start first to register.');
          return;
        }
        
        db.all(
          `SELECT l.title, ul.status, ul.progress_percent, ul.score 
           FROM user_lessons ul 
           JOIN lessons l ON ul.lesson_id = l.id 
           WHERE ul.user_id = ?`,
          [user.id],
          (err, rows) => {
            if (err || !rows || rows.length === 0) {
              bot.sendMessage(chatId, `📊 *Your Progress*\n\nYou haven't started any lessons yet. Use /lessons to get started!`, { parse_mode: 'Markdown' });
              return;
            }
            
            let progressMsg = `📊 *Your Learning Progress*\n\n`;
            rows.forEach(row => {
              const statusEmoji = row.status === 'completed' ? '✅' : row.status === 'in_progress' ? '🔄' : '⏳';
              progressMsg += `${statusEmoji} *${row.title}*\n`;
              progressMsg += `   Progress: ${row.progress_percent || 0}%`;
              if (row.score) progressMsg += ` | Score: ${row.score}`;
              progressMsg += '\n\n';
            });
            
            bot.sendMessage(chatId, progressMsg, { parse_mode: 'Markdown' });
          }
        );
      }
    );
    
    logMessage(chatId, msg.text, 'command', 'progress_shown');
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🆘 *Dora Learning App Help*

*Available Commands:*
/start - Start the bot & register
/lessons - View all lessons
/progress - Check your progress
/help - Show this help message

*How it works:*
1. Browse lessons with /lessons
2. Tap a lesson to start learning
3. Answer questions to test your knowledge
4. Track your progress with /progress

*Need more help?*
Contact support at support@example.com
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    logMessage(chatId, msg.text, 'command', 'help_shown');
  });

  // Handle button callbacks
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    bot.answerCallbackQuery(query.id);
    
    if (data === 'browse_lessons') {
      sendLessonsList(chatId);
    } else if (data === 'quick_start') {
      // Start with first lesson
      db.get('SELECT * FROM lessons ORDER BY id ASC LIMIT 1', [], (err, lesson) => {
        if (lesson) {
          sendLesson(chatId, lesson);
        } else {
          bot.sendMessage(chatId, '📚 No lessons available yet. Check back soon!');
        }
      });
    } else if (data === 'my_progress') {
      bot.emit('text', { chat: { id: chatId }, from: query.from, text: '/progress' });
    } else if (data.startsWith('lesson_')) {
      const lessonId = parseInt(data.replace('lesson_', ''));
      db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
        if (lesson) {
          sendLesson(chatId, lesson);
          // Track progress
          db.get('SELECT id FROM users WHERE telegram_id = ?', [String(chatId)], (err, user) => {
            if (user) {
              db.run(
                `INSERT OR REPLACE INTO user_lessons (user_id, lesson_id, status, progress_percent) VALUES (?, ?, 'in_progress', 10)`,
                [user.id, lessonId]
              );
            }
          });
        }
      });
    } else if (data === 'back_to_lessons') {
      sendLessonsList(chatId);
    }
    
    logMessage(chatId, data, 'callback', 'callback_handled');
  });

  // Handle regular text messages
  bot.on('message', (msg) => {
    // Skip commands (they're handled separately)
    if (msg.text && msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    
    // Simple conversational response
    if (msg.text) {
      const responses = [
        "🤔 Interesting! Use /lessons to continue learning.",
        "📚 Ready to learn? Try /lessons to see available courses.",
        "💡 Type /help if you need assistance!",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      bot.sendMessage(chatId, response);
      logMessage(chatId, msg.text, 'message', response);
    }
  });

  // Helper: Send lessons list
  function sendLessonsList(chatId) {
    db.all('SELECT id, title, difficulty FROM lessons ORDER BY id ASC', [], (err, lessons) => {
      if (err || !lessons || lessons.length === 0) {
        bot.sendMessage(chatId, '📚 No lessons available yet. Check back soon!');
        return;
      }
      
      const keyboard = lessons.map(lesson => [{
        text: `📖 ${lesson.title} (${lesson.difficulty})`,
        callback_data: `lesson_${lesson.id}`
      }]);
      
      bot.sendMessage(chatId, '📚 *Available Lessons*\n\nSelect a lesson to get started:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    });
  }

  // Helper: Send a lesson
  function sendLesson(chatId, lesson) {
    const lessonMessage = `
📖 *${lesson.title}*
_Difficulty: ${lesson.difficulty}_

${lesson.description || 'No description available.'}

---
${lesson.content || 'Lesson content coming soon...'}
    `;
    
    bot.sendMessage(chatId, lessonMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Mark Complete', callback_data: `complete_${lesson.id}` }],
          [{ text: '⬅️ Back to Lessons', callback_data: 'back_to_lessons' }]
        ]
      }
    });
  }

  // Helper: Log message to database
  function logMessage(userId, text, type, response) {
    db.run(
      `INSERT INTO telegram_messages (user_id, message_text, message_type, response) VALUES (?, ?, ?, ?)`,
      [userId, text, type, response]
    );
  }

  // Bot error handling
  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.code, error.message);
  });

} else {
  console.log('⚠️  TELEGRAM_BOT_TOKEN not set - bot disabled');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    telegram_bot: bot ? 'active' : 'disabled'
  });
});

// API Routes
app.get('/api/lessons', (req, res) => {
  db.all('SELECT * FROM lessons ORDER BY id ASC', [], (err, lessons) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ lessons: lessons || [] });
  });
});

app.get('/api/lessons/:id', (req, res) => {
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

app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  // TODO: Implement proper authentication
  res.json({
    token: 'sample-jwt-token',
    user: { id: 1, email, name: 'User' }
  });
});

app.get('/api/users/profile', (req, res) => {
  // TODO: Get user profile from token
  res.json({
    id: 1,
    name: 'Student Name',
    email: 'student@example.com',
    lessonProgress: []
  });
});

// Stats endpoint for admin
app.get('/api/stats', (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    stats.users = row?.count || 0;
    
    db.get('SELECT COUNT(*) as count FROM lessons', [], (err, row) => {
      stats.lessons = row?.count || 0;
      
      db.get('SELECT COUNT(*) as count FROM telegram_messages', [], (err, row) => {
        stats.messages = row?.count || 0;
        res.json(stats);
      });
    });
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
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  if (bot) bot.stopPolling();
  db.close();
  process.exit(0);
});

module.exports = app;

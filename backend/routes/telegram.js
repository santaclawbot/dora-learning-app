/**
 * Telegram Bot Webhook Handler for Dora Learning App
 * Card #16 - Handles incoming messages from kids (text + photos)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Telegram Bot configuration
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = TELEGRAM_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}` : null;

// Upload directory for photos from Telegram
const TELEGRAM_UPLOAD_DIR = path.join(__dirname, '../uploads/telegram');
if (!fs.existsSync(TELEGRAM_UPLOAD_DIR)) {
  fs.mkdirSync(TELEGRAM_UPLOAD_DIR, { recursive: true });
}

// Promisify helper
function promisify(db, method, sql, params = []) {
  return new Promise((resolve, reject) => {
    if (method === 'run') {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    } else if (method === 'get') {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    } else if (method === 'all') {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }
  });
}

// Helper: Generate unique ID
function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Helper: Send message via Telegram
async function sendTelegramMessage(chatId, text, options = {}) {
  if (!TELEGRAM_API) {
    console.error('❌ Telegram not configured');
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      ...options
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Telegram sendMessage error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Helper: Send typing action
async function sendTypingAction(chatId) {
  if (!TELEGRAM_API) return;
  
  try {
    await axios.post(`${TELEGRAM_API}/sendChatAction`, {
      chat_id: chatId,
      action: 'typing'
    });
  } catch (err) {
    // Non-critical, ignore
  }
}

// Helper: Download file from Telegram
async function downloadTelegramFile(fileId) {
  if (!TELEGRAM_API) return null;

  try {
    // Get file path from Telegram
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile`, {
      params: { file_id: fileId }
    });

    const filePath = fileInfo.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;

    // Download the file
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer'
    });

    // Generate local filename
    const ext = path.extname(filePath) || '.jpg';
    const localFilename = `tg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const localPath = path.join(TELEGRAM_UPLOAD_DIR, localFilename);

    // Save file
    fs.writeFileSync(localPath, response.data);

    return {
      filename: localFilename,
      path: localPath,
      url: `/uploads/telegram/${localFilename}`,
      size: response.data.length
    };
  } catch (error) {
    console.error('❌ Error downloading Telegram file:', error.message);
    return null;
  }
}

// Helper: Get or create user from Telegram
async function getOrCreateTelegramUser(db, telegramUser) {
  const telegramId = String(telegramUser.id);
  
  // Check if user exists
  let user = await promisify(db, 'get', 
    'SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
  
  if (!user) {
    // Create new user
    const name = [telegramUser.first_name, telegramUser.last_name]
      .filter(Boolean).join(' ') || 'Friend';
    
    const result = await promisify(db, 'run',
      `INSERT INTO users (telegram_id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [telegramId, name]
    );
    
    user = await promisify(db, 'get', 'SELECT * FROM users WHERE id = ?', [result.lastID]);
    console.log(`👤 New Telegram user created: ${name} (${telegramId})`);
  }
  
  return user;
}

// Helper: Get Dora response
async function getDoraResponse(db, userId, message, imageUrl = null) {
  // Import Dora helpers from server (we'll call internal endpoints)
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = process.env.ANTHROPIC_API_KEY 
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) 
    : null;
  
  if (!anthropic) {
    return {
      success: false,
      text: "Hi friend! 🌟 I'm having a little trouble right now. Try again soon! 💫"
    };
  }
  
  try {
    // Build Dora system prompt
    const systemPrompt = `You are Dora, a friendly and enthusiastic AI teacher for young children (ages 3-8).

Rules:
- Use simple words a 5-year-old understands
- Keep responses short (2-4 sentences max)
- Be warm, encouraging, and patient
- Use lots of emojis! 🌟⭐💫
- Always be positive and supportive
- If you don't know something, say "Let's find out together!"
- Never discuss anything inappropriate for children
- Redirect scary/violent topics to something fun
- If a child sends a photo, describe what you see and teach something fun about it!`;

    // Build messages
    const messages = [];
    
    if (imageUrl) {
      // Vision request with image
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl
            }
          },
          {
            type: 'text',
            text: message || "What is this? Tell me something fun about it! 🔍"
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages
    });
    
    return { success: true, text: response.content[0].text };
    
  } catch (error) {
    console.error('❌ Dora response error:', error.message);
    return {
      success: false,
      text: "Oops! 🌈 I got a little confused. Can you ask me again, friend? 💫"
    };
  }
}

// Helper: Log message to database
async function logTelegramMessage(db, userId, messageText, messageType, response) {
  try {
    await promisify(db, 'run',
      `INSERT INTO telegram_messages (user_id, message_text, message_type, response, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, messageText, messageType, response]
    );
  } catch (err) {
    console.warn('⚠️ Could not log Telegram message:', err.message);
  }
}

// Helper: Track exploration (photos, questions, topics)
async function trackExploration(db, userId, type, content, metadata = {}) {
  try {
    const id = generateId('exp_');
    await promisify(db, 'run',
      `INSERT INTO explorations (id, user_id, type, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, userId, type, content, JSON.stringify(metadata)]
    );
    return id;
  } catch (err) {
    console.warn('⚠️ Could not track exploration:', err.message);
    return null;
  }
}

// ========================================
// TELEGRAM WEBHOOK ROUTES
// ========================================

/**
 * POST /webhook/telegram
 * Main webhook endpoint for Telegram Bot API
 */
router.post('/', async (req, res) => {
  const db = req.app.get('db');
  
  if (!db) {
    console.error('❌ Database not available');
    return res.sendStatus(500);
  }
  
  // Always respond 200 to Telegram quickly
  res.sendStatus(200);
  
  try {
    const update = req.body;
    
    // Only handle messages (not edits, callbacks, etc.)
    if (!update.message) {
      return;
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const telegramUser = message.from;
    
    console.log(`📩 Telegram message from ${telegramUser.first_name} (${telegramUser.id})`);
    
    // Get or create user
    const user = await getOrCreateTelegramUser(db, telegramUser);
    
    // Send typing indicator
    await sendTypingAction(chatId);
    
    let messageType = 'text';
    let messageText = message.text || '';
    let responseText = '';
    let photoInfo = null;
    
    // Handle /start command
    if (message.text && message.text.startsWith('/start')) {
      responseText = `Hi ${telegramUser.first_name}! 🌟

I'm Dora, your friendly learning buddy! 

You can:
📸 Send me a photo of something curious
❓ Ask me any question
🎨 Learn fun things together!

What would you like to explore today? 💫`;
      
      await sendTelegramMessage(chatId, responseText);
      await logTelegramMessage(db, user.id, '/start', 'command', responseText);
      return;
    }
    
    // Handle photo messages
    if (message.photo && message.photo.length > 0) {
      messageType = 'photo';
      
      // Get the largest photo (last in array)
      const photo = message.photo[message.photo.length - 1];
      const caption = message.caption || '';
      
      console.log(`📸 Photo received from ${telegramUser.first_name}`);
      
      // Download the photo
      photoInfo = await downloadTelegramFile(photo.file_id);
      
      if (photoInfo) {
        // Save photo to database
        try {
          const profileId = `tg_${telegramUser.id}`;
          await promisify(db, 'run',
            `INSERT INTO photos (filename, original_name, mimetype, size, url, profile_id, description, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [photoInfo.filename, 'telegram_photo.jpg', 'image/jpeg', photoInfo.size, photoInfo.url, profileId, caption]
          );
        } catch (err) {
          console.warn('⚠️ Could not save photo to DB:', err.message);
        }
        
        // Track photo exploration
        await trackExploration(db, user.id, 'photo', caption || 'photo', {
          filename: photoInfo.filename,
          telegram_file_id: photo.file_id
        });
        
        // Get Dora's response about the photo
        // For local files, we need to construct a proper URL
        // In production, this would be your public URL
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const imageUrl = `${baseUrl}${photoInfo.url}`;
        
        const doraResponse = await getDoraResponse(db, user.id, caption, imageUrl);
        responseText = doraResponse.text;
        messageText = caption || '[Photo]';
        
      } else {
        responseText = "Oops! 🌈 I couldn't see your photo. Can you send it again? 📸";
      }
      
    } else if (message.text) {
      // Handle text messages
      messageText = message.text;
      
      // Track question exploration
      await trackExploration(db, user.id, 'question', messageText, {
        chat_id: chatId
      });
      
      // Get Dora's response
      const doraResponse = await getDoraResponse(db, user.id, messageText);
      responseText = doraResponse.text;
      
    } else {
      // Unsupported message type
      responseText = "I can read your messages and look at your photos! 📸✨ Try sending me a picture or asking a question! 🌟";
      messageType = 'unsupported';
    }
    
    // Send response
    await sendTelegramMessage(chatId, responseText);
    
    // Log the interaction
    await logTelegramMessage(db, user.id, messageText, messageType, responseText);
    
    console.log(`✅ Responded to ${telegramUser.first_name}`);
    
  } catch (error) {
    console.error('❌ Telegram webhook error:', error);
  }
});

/**
 * GET /webhook/telegram/status
 * Check Telegram bot status
 */
router.get('/status', async (req, res) => {
  if (!TELEGRAM_API) {
    return res.json({
      configured: false,
      error: 'TELEGRAM_TOKEN not set'
    });
  }
  
  try {
    const response = await axios.get(`${TELEGRAM_API}/getMe`);
    res.json({
      configured: true,
      bot: response.data.result
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      error: error.message
    });
  }
});

/**
 * POST /webhook/telegram/set-webhook
 * Set up the webhook URL with Telegram
 */
router.post('/set-webhook', async (req, res) => {
  if (!TELEGRAM_API) {
    return res.status(400).json({
      success: false,
      error: 'TELEGRAM_TOKEN not set'
    });
  }
  
  const { url } = req.body;
  const webhookUrl = url || process.env.TELEGRAM_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return res.status(400).json({
      success: false,
      error: 'Webhook URL is required'
    });
  }
  
  try {
    const response = await axios.post(`${TELEGRAM_API}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message']
    });
    
    res.json({
      success: true,
      result: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /webhook/telegram/info
 * Get current webhook info
 */
router.get('/info', async (req, res) => {
  if (!TELEGRAM_API) {
    return res.status(400).json({
      success: false,
      error: 'TELEGRAM_TOKEN not set'
    });
  }
  
  try {
    const response = await axios.get(`${TELEGRAM_API}/getWebhookInfo`);
    res.json({
      success: true,
      info: response.data.result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

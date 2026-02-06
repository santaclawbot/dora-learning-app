require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram webhook endpoint
app.post('/webhook/telegram', (req, res) => {
  console.log('Telegram message received:', req.body);
  
  try {
    const { message, callback_query } = req.body;
    
    if (message) {
      console.log(`Message from ${message.from.username}: ${message.text}`);
      // TODO: Handle message logic
    }
    
    if (callback_query) {
      console.log(`Button pressed by ${callback_query.from.username}`);
      // TODO: Handle button callbacks
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Routes
app.get('/api/lessons', (req, res) => {
  // TODO: Fetch lessons from database
  res.json({
    lessons: [
      {
        id: 1,
        title: 'Introduction to Learning',
        description: 'Get started with Dora',
        difficulty: 'Beginner'
      }
    ]
  });
});

app.get('/api/lessons/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Fetch specific lesson from database
  res.json({
    id,
    title: 'Sample Lesson',
    content: 'Lesson content here...',
    exercises: []
  });
});

app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  // TODO: Implement authentication
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
  console.log(`📡 Telegram webhook ready at http://localhost:${PORT}/webhook/telegram`);
});

module.exports = app;

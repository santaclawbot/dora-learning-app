/**
 * CRUD Routes for Dora Learning App
 * RESTful API endpoints for users, lessons, user_lessons, responses
 */

const express = require('express');
const router = express.Router();
const { Users, Lessons, UserLessons, Responses } = require('../db/crud');

// Middleware to attach db from app
function attachDb(req, res, next) {
  req.db = req.app.get('db');
  if (!req.db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  next();
}

router.use(attachDb);

// ========================================
// USERS ROUTES
// ========================================

// GET /api/crud/users - List all users
router.get('/users', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const users = await Users.getAll(req.db, { 
      limit: parseInt(limit) || 100, 
      offset: parseInt(offset) || 0 
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/crud/users/:id - Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await Users.getById(req.db, parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Don't expose password hash
    delete user.password_hash;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// POST /api/crud/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const { telegram_id, email, name, password_hash, profile_pic } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    const user = await Users.create(req.db, { telegram_id, email, name, password_hash, profile_pic });
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'User with this email/telegram_id already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// PUT /api/crud/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const existing = await Users.getById(req.db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const result = await Users.update(req.db, id, updates);
    const user = await Users.getById(req.db, id);
    delete user.password_hash;
    
    res.json({ success: true, user, changes: result.changes });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/crud/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const existing = await Users.getById(req.db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const result = await Users.delete(req.db, id);
    res.json({ success: true, deleted: result.changes > 0 });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ========================================
// LESSONS ROUTES
// ========================================

// GET /api/crud/lessons - List all lessons
router.get('/lessons', async (req, res) => {
  try {
    const { limit, offset, difficulty } = req.query;
    const lessons = await Lessons.getAll(req.db, { 
      limit: parseInt(limit) || 100, 
      offset: parseInt(offset) || 0,
      difficulty 
    });
    const count = await Lessons.count(req.db);
    res.json({ success: true, lessons, total: count });
  } catch (err) {
    console.error('Error fetching lessons:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons' });
  }
});

// GET /api/crud/lessons/:id - Get lesson by ID
router.get('/lessons/:id', async (req, res) => {
  try {
    const lesson = await Lessons.getById(req.db, parseInt(req.params.id));
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }
    res.json({ success: true, lesson });
  } catch (err) {
    console.error('Error fetching lesson:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch lesson' });
  }
});

// POST /api/crud/lessons - Create new lesson
router.post('/lessons', async (req, res) => {
  try {
    const { title, description, content, difficulty, duration_minutes, thumbnail_url } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    
    const lesson = await Lessons.create(req.db, { title, description, content, difficulty, duration_minutes, thumbnail_url });
    res.status(201).json({ success: true, lesson });
  } catch (err) {
    console.error('Error creating lesson:', err);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
});

// PUT /api/crud/lessons/:id - Update lesson
router.put('/lessons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const existing = await Lessons.getById(req.db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }
    
    const result = await Lessons.update(req.db, id, updates);
    const lesson = await Lessons.getById(req.db, id);
    
    res.json({ success: true, lesson, changes: result.changes });
  } catch (err) {
    console.error('Error updating lesson:', err);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
});

// DELETE /api/crud/lessons/:id - Delete lesson
router.delete('/lessons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const existing = await Lessons.getById(req.db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }
    
    const result = await Lessons.delete(req.db, id);
    res.json({ success: true, deleted: result.changes > 0 });
  } catch (err) {
    console.error('Error deleting lesson:', err);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

// ========================================
// USER_LESSONS (Progress) ROUTES
// ========================================

// GET /api/crud/progress/:userId - Get all progress for a user
router.get('/progress/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const progress = await UserLessons.getByUser(req.db, userId);
    const stats = await UserLessons.getUserStats(req.db, userId);
    res.json({ success: true, progress, stats });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// GET /api/crud/progress/:userId/:lessonId - Get specific progress
router.get('/progress/:userId/:lessonId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const lessonId = parseInt(req.params.lessonId);
    const progress = await UserLessons.get(req.db, userId, lessonId);
    
    if (!progress) {
      return res.json({ success: true, progress: null, message: 'No progress yet' });
    }
    res.json({ success: true, progress });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// POST /api/crud/progress - Create/update progress (upsert)
router.post('/progress', async (req, res) => {
  try {
    const { user_id, lesson_id, status, progress_percent, score } = req.body;
    
    if (!user_id || !lesson_id) {
      return res.status(400).json({ success: false, error: 'user_id and lesson_id are required' });
    }
    
    const progress = await UserLessons.upsert(req.db, { user_id, lesson_id, status, progress_percent, score });
    res.json({ success: true, progress });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// PUT /api/crud/progress/:userId/:lessonId - Update progress
router.put('/progress/:userId/:lessonId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const lessonId = parseInt(req.params.lessonId);
    const { progress_percent } = req.body;
    
    if (progress_percent === undefined) {
      return res.status(400).json({ success: false, error: 'progress_percent is required' });
    }
    
    const result = await UserLessons.updateProgress(req.db, userId, lessonId, progress_percent);
    const progress = await UserLessons.get(req.db, userId, lessonId);
    
    res.json({ success: true, progress, changes: result.changes });
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

// POST /api/crud/progress/:userId/:lessonId/complete - Mark lesson complete
router.post('/progress/:userId/:lessonId/complete', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const lessonId = parseInt(req.params.lessonId);
    const { score } = req.body;
    
    await UserLessons.complete(req.db, userId, lessonId, score);
    const progress = await UserLessons.get(req.db, userId, lessonId);
    
    res.json({ success: true, progress, message: 'Lesson completed! 🎉' });
  } catch (err) {
    console.error('Error completing lesson:', err);
    res.status(500).json({ success: false, error: 'Failed to complete lesson' });
  }
});

// DELETE /api/crud/progress/:userId/:lessonId - Reset progress
router.delete('/progress/:userId/:lessonId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const lessonId = parseInt(req.params.lessonId);
    
    const result = await UserLessons.delete(req.db, userId, lessonId);
    res.json({ success: true, deleted: result.changes > 0 });
  } catch (err) {
    console.error('Error deleting progress:', err);
    res.status(500).json({ success: false, error: 'Failed to delete progress' });
  }
});

// ========================================
// RESPONSES ROUTES
// ========================================

// GET /api/crud/responses/user/:userId - Get all responses for a user
router.get('/responses/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { limit, offset } = req.query;
    const responses = await Responses.getByUser(req.db, userId, {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });
    const accuracy = await Responses.getUserAccuracy(req.db, userId);
    res.json({ success: true, responses, accuracy });
  } catch (err) {
    console.error('Error fetching responses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch responses' });
  }
});

// GET /api/crud/responses/:userId/:lessonId - Get responses for a user on a lesson
router.get('/responses/:userId/:lessonId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const lessonId = parseInt(req.params.lessonId);
    const responses = await Responses.getByUserLesson(req.db, userId, lessonId);
    res.json({ success: true, responses });
  } catch (err) {
    console.error('Error fetching responses:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch responses' });
  }
});

// GET /api/crud/responses/lesson/:lessonId/stats - Get lesson statistics
router.get('/responses/lesson/:lessonId/stats', async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    const stats = await Responses.getLessonStats(req.db, lessonId);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// POST /api/crud/responses - Create a response
router.post('/responses', async (req, res) => {
  try {
    const { user_id, lesson_id, question_id, answer, is_correct } = req.body;
    
    if (!user_id || !lesson_id || answer === undefined) {
      return res.status(400).json({ success: false, error: 'user_id, lesson_id, and answer are required' });
    }
    
    const response = await Responses.create(req.db, { user_id, lesson_id, question_id, answer, is_correct });
    res.status(201).json({ success: true, response });
  } catch (err) {
    console.error('Error creating response:', err);
    res.status(500).json({ success: false, error: 'Failed to create response' });
  }
});

// PUT /api/crud/responses/:id - Update a response
router.put('/responses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { answer, is_correct } = req.body;
    
    const existing = await Responses.getById(req.db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Response not found' });
    }
    
    const result = await Responses.update(req.db, id, { answer, is_correct });
    const response = await Responses.getById(req.db, id);
    
    res.json({ success: true, response, changes: result.changes });
  } catch (err) {
    console.error('Error updating response:', err);
    res.status(500).json({ success: false, error: 'Failed to update response' });
  }
});

// DELETE /api/crud/responses/:id - Delete a response
router.delete('/responses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const existing = await Responses.getById(req.db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Response not found' });
    }
    
    const result = await Responses.delete(req.db, id);
    res.json({ success: true, deleted: result.changes > 0 });
  } catch (err) {
    console.error('Error deleting response:', err);
    res.status(500).json({ success: false, error: 'Failed to delete response' });
  }
});

// DELETE /api/crud/responses/:userId/:lessonId - Reset all responses for user on lesson
router.delete('/responses/:userId/:lessonId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const lessonId = parseInt(req.params.lessonId);
    
    const result = await Responses.deleteByUserLesson(req.db, userId, lessonId);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    console.error('Error deleting responses:', err);
    res.status(500).json({ success: false, error: 'Failed to delete responses' });
  }
});

module.exports = router;

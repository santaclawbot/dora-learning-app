/**
 * Progress Tracking Routes for Dora Learning App
 * Card #18 - Track exploration history and learning moments
 * 
 * Uses the CRUD layer (UserLessons, Responses) to track:
 * - Photos kids have explored
 * - Questions asked
 * - Topics discovered
 * - Learning progress dashboard data
 */

const express = require('express');
const router = express.Router();
const { UserLessons, Responses } = require('../db/crud');

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

// Middleware to attach db
function attachDb(req, res, next) {
  req.db = req.app.get('db');
  if (!req.db) {
    return res.status(500).json({ success: false, error: 'Database not available' });
  }
  next();
}

router.use(attachDb);

// ========================================
// EXPLORATIONS TRACKING
// ========================================

/**
 * POST /api/progress/exploration
 * Track a new exploration (photo, question, or topic discovery)
 * 
 * Body: { userId, profileId, type: 'photo'|'question'|'topic', content, metadata }
 */
router.post('/exploration', async (req, res) => {
  try {
    const { userId, profileId, type, content, metadata } = req.body;
    
    if (!type || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'type and content are required' 
      });
    }
    
    const id = generateId('exp_');
    const metadataJson = JSON.stringify(metadata || {});
    
    await promisify(req.db, 'run',
      `INSERT INTO explorations (id, user_id, profile_id, type, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, userId || null, profileId || null, type, content, metadataJson]
    );
    
    res.status(201).json({
      success: true,
      exploration: { id, userId, profileId, type, content, metadata }
    });
    
  } catch (err) {
    console.error('Error tracking exploration:', err);
    res.status(500).json({ success: false, error: 'Failed to track exploration' });
  }
});

/**
 * GET /api/progress/explorations/:profileId
 * Get all explorations for a profile
 */
router.get('/explorations/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { type, limit, offset } = req.query;
    
    let sql = `SELECT * FROM explorations WHERE profile_id = ?`;
    const params = [profileId];
    
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);
    
    const explorations = await promisify(req.db, 'all', sql, params);
    
    // Parse metadata JSON
    explorations.forEach(exp => {
      try {
        exp.metadata = JSON.parse(exp.metadata || '{}');
      } catch (e) {
        exp.metadata = {};
      }
    });
    
    res.json({ success: true, explorations });
    
  } catch (err) {
    console.error('Error fetching explorations:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch explorations' });
  }
});

/**
 * GET /api/progress/explorations/user/:userId
 * Get all explorations for a user (across all profiles)
 */
router.get('/explorations/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, limit, offset } = req.query;
    
    let sql = `SELECT * FROM explorations WHERE user_id = ?`;
    const params = [parseInt(userId)];
    
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);
    
    const explorations = await promisify(req.db, 'all', sql, params);
    
    // Parse metadata JSON
    explorations.forEach(exp => {
      try {
        exp.metadata = JSON.parse(exp.metadata || '{}');
      } catch (e) {
        exp.metadata = {};
      }
    });
    
    res.json({ success: true, explorations });
    
  } catch (err) {
    console.error('Error fetching user explorations:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch explorations' });
  }
});

// ========================================
// TOPICS TRACKING
// ========================================

/**
 * POST /api/progress/topic
 * Record a topic discovery
 * 
 * Body: { userId, profileId, topicName, source: 'photo'|'question'|'lesson' }
 */
router.post('/topic', async (req, res) => {
  try {
    const { userId, profileId, topicName, source } = req.body;
    
    if (!topicName) {
      return res.status(400).json({ 
        success: false, 
        error: 'topicName is required' 
      });
    }
    
    const id = generateId('topic_');
    
    // Check if topic already discovered by this profile
    const existing = await promisify(req.db, 'get',
      `SELECT * FROM topics_discovered WHERE profile_id = ? AND topic_name = ?`,
      [profileId, topicName]
    );
    
    if (existing) {
      // Update discovery count
      await promisify(req.db, 'run',
        `UPDATE topics_discovered SET discovery_count = discovery_count + 1, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [existing.id]
      );
      
      res.json({
        success: true,
        topic: { ...existing, discovery_count: existing.discovery_count + 1 },
        isNew: false
      });
    } else {
      // Create new topic discovery
      await promisify(req.db, 'run',
        `INSERT INTO topics_discovered (id, user_id, profile_id, topic_name, source, discovery_count, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, userId || null, profileId, topicName, source || 'unknown']
      );
      
      res.status(201).json({
        success: true,
        topic: { id, userId, profileId, topicName, source, discovery_count: 1 },
        isNew: true
      });
    }
    
  } catch (err) {
    console.error('Error tracking topic:', err);
    res.status(500).json({ success: false, error: 'Failed to track topic' });
  }
});

/**
 * GET /api/progress/topics/:profileId
 * Get all discovered topics for a profile
 */
router.get('/topics/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { limit } = req.query;
    
    const topics = await promisify(req.db, 'all',
      `SELECT * FROM topics_discovered 
       WHERE profile_id = ? 
       ORDER BY last_seen_at DESC 
       LIMIT ?`,
      [profileId, parseInt(limit) || 100]
    );
    
    res.json({ success: true, topics });
    
  } catch (err) {
    console.error('Error fetching topics:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch topics' });
  }
});

// ========================================
// DASHBOARD ENDPOINTS
// ========================================

/**
 * GET /api/progress/dashboard/:profileId
 * Get comprehensive progress dashboard for a profile
 */
router.get('/dashboard/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    
    // Get exploration stats
    const explorationStats = await promisify(req.db, 'get',
      `SELECT 
         COUNT(*) as total_explorations,
         SUM(CASE WHEN type = 'photo' THEN 1 ELSE 0 END) as photos_explored,
         SUM(CASE WHEN type = 'question' THEN 1 ELSE 0 END) as questions_asked,
         MIN(created_at) as first_exploration,
         MAX(created_at) as last_exploration
       FROM explorations
       WHERE profile_id = ?`,
      [profileId]
    );
    
    // Get topic count
    const topicStats = await promisify(req.db, 'get',
      `SELECT 
         COUNT(*) as topics_discovered,
         SUM(discovery_count) as total_topic_views
       FROM topics_discovered
       WHERE profile_id = ?`,
      [profileId]
    );
    
    // Get recent explorations (last 5)
    const recentExplorations = await promisify(req.db, 'all',
      `SELECT id, type, content, created_at 
       FROM explorations 
       WHERE profile_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [profileId]
    );
    
    // Get top topics (most viewed)
    const topTopics = await promisify(req.db, 'all',
      `SELECT topic_name, discovery_count, last_seen_at
       FROM topics_discovered
       WHERE profile_id = ?
       ORDER BY discovery_count DESC
       LIMIT 5`,
      [profileId]
    );
    
    // Get conversation count from dora_conversations
    const conversationStats = await promisify(req.db, 'get',
      `SELECT COUNT(*) as conversation_count
       FROM dora_conversations
       WHERE profile_id = ?`,
      [profileId]
    );
    
    // Get message count
    const messageStats = await promisify(req.db, 'get',
      `SELECT COUNT(*) as total_messages
       FROM dora_messages dm
       JOIN dora_conversations dc ON dm.conversation_id = dc.id
       WHERE dc.profile_id = ? AND dm.role = 'user'`,
      [profileId]
    );
    
    // Get photos count
    const photoCount = await promisify(req.db, 'get',
      `SELECT COUNT(*) as photos_count
       FROM photos
       WHERE profile_id = ?`,
      [profileId]
    );
    
    // Calculate engagement streak (days with activity)
    const streakData = await promisify(req.db, 'all',
      `SELECT DISTINCT DATE(created_at) as activity_date
       FROM explorations
       WHERE profile_id = ?
       ORDER BY activity_date DESC
       LIMIT 30`,
      [profileId]
    );
    
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (streakData.length > 0) {
      // Check if activity today or yesterday
      const lastActivity = streakData[0]?.activity_date;
      if (lastActivity === today || lastActivity === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < streakData.length; i++) {
          const prevDate = new Date(streakData[i-1].activity_date);
          const currDate = new Date(streakData[i].activity_date);
          const diffDays = (prevDate - currDate) / 86400000;
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    
    res.json({
      success: true,
      dashboard: {
        profileId,
        summary: {
          totalExplorations: explorationStats?.total_explorations || 0,
          photosExplored: explorationStats?.photos_explored || 0,
          questionsAsked: explorationStats?.questions_asked || 0,
          topicsDiscovered: topicStats?.topics_discovered || 0,
          conversationsHad: conversationStats?.conversation_count || 0,
          messagesExchanged: messageStats?.total_messages || 0,
          photosUploaded: photoCount?.photos_count || 0,
          currentStreak: currentStreak
        },
        activity: {
          firstExploration: explorationStats?.first_exploration || null,
          lastExploration: explorationStats?.last_exploration || null
        },
        recentExplorations,
        topTopics,
        achievements: calculateAchievements({
          photosExplored: explorationStats?.photos_explored || 0,
          questionsAsked: explorationStats?.questions_asked || 0,
          topicsDiscovered: topicStats?.topics_discovered || 0,
          currentStreak
        })
      }
    });
    
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/progress/dashboard/user/:userId
 * Get dashboard for all profiles under a user (parent view)
 */
router.get('/dashboard/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all profiles' summaries
    const profileSummaries = await promisify(req.db, 'all',
      `SELECT 
         e.profile_id,
         COUNT(*) as total_explorations,
         SUM(CASE WHEN e.type = 'photo' THEN 1 ELSE 0 END) as photos_explored,
         SUM(CASE WHEN e.type = 'question' THEN 1 ELSE 0 END) as questions_asked,
         MAX(e.created_at) as last_activity
       FROM explorations e
       WHERE e.user_id = ?
       GROUP BY e.profile_id`,
      [parseInt(userId)]
    );
    
    // Get lesson progress stats per user
    const lessonProgress = await UserLessons.getUserStats(req.db, parseInt(userId));
    
    // Get response accuracy
    const responseAccuracy = await Responses.getUserAccuracy(req.db, parseInt(userId));
    
    res.json({
      success: true,
      dashboard: {
        userId: parseInt(userId),
        profiles: profileSummaries,
        lessonProgress: lessonProgress || {},
        responseAccuracy: responseAccuracy || {}
      }
    });
    
  } catch (err) {
    console.error('Error fetching user dashboard:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/progress/timeline/:profileId
 * Get exploration timeline for a profile
 */
router.get('/timeline/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { days } = req.query;
    const daysBack = parseInt(days) || 7;
    
    // Get explorations grouped by day
    const timeline = await promisify(req.db, 'all',
      `SELECT 
         DATE(created_at) as date,
         type,
         COUNT(*) as count
       FROM explorations
       WHERE profile_id = ?
         AND created_at >= datetime('now', '-${daysBack} days')
       GROUP BY DATE(created_at), type
       ORDER BY date DESC`,
      [profileId]
    );
    
    // Organize by date
    const timelineByDate = {};
    timeline.forEach(item => {
      if (!timelineByDate[item.date]) {
        timelineByDate[item.date] = { date: item.date, photos: 0, questions: 0, topics: 0 };
      }
      timelineByDate[item.date][item.type + 's'] = item.count;
    });
    
    res.json({
      success: true,
      timeline: Object.values(timelineByDate).sort((a, b) => b.date.localeCompare(a.date))
    });
    
  } catch (err) {
    console.error('Error fetching timeline:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch timeline' });
  }
});

// ========================================
// LESSON PROGRESS (Using CRUD Layer)
// ========================================

/**
 * GET /api/progress/lessons/:userId
 * Get lesson progress for a user
 */
router.get('/lessons/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const progress = await UserLessons.getByUser(req.db, userId);
    const stats = await UserLessons.getUserStats(req.db, userId);
    
    res.json({ success: true, progress, stats });
  } catch (err) {
    console.error('Error fetching lesson progress:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch lesson progress' });
  }
});

/**
 * POST /api/progress/lessons
 * Update lesson progress
 */
router.post('/lessons', async (req, res) => {
  try {
    const { user_id, lesson_id, status, progress_percent, score } = req.body;
    
    if (!user_id || !lesson_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id and lesson_id are required' 
      });
    }
    
    const progress = await UserLessons.upsert(req.db, { 
      user_id, lesson_id, status, progress_percent, score 
    });
    
    res.json({ success: true, progress });
  } catch (err) {
    console.error('Error updating lesson progress:', err);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

/**
 * POST /api/progress/lessons/:userId/:lessonId/complete
 * Mark a lesson as complete
 */
router.post('/lessons/:userId/:lessonId/complete', async (req, res) => {
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

// ========================================
// RESPONSES TRACKING (Using CRUD Layer)
// ========================================

/**
 * POST /api/progress/responses
 * Track a response to an exercise
 */
router.post('/responses', async (req, res) => {
  try {
    const { user_id, lesson_id, question_id, answer, is_correct } = req.body;
    
    if (!user_id || !lesson_id || answer === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id, lesson_id, and answer are required' 
      });
    }
    
    const response = await Responses.create(req.db, { 
      user_id, lesson_id, question_id, answer, is_correct 
    });
    
    res.status(201).json({ success: true, response });
  } catch (err) {
    console.error('Error creating response:', err);
    res.status(500).json({ success: false, error: 'Failed to track response' });
  }
});

/**
 * GET /api/progress/responses/:userId
 * Get all responses for a user
 */
router.get('/responses/:userId', async (req, res) => {
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

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate achievements based on activity
 */
function calculateAchievements(stats) {
  const achievements = [];
  
  // Photo achievements
  if (stats.photosExplored >= 1) {
    achievements.push({ id: 'first_photo', name: 'First Photo! 📸', earned: true });
  }
  if (stats.photosExplored >= 10) {
    achievements.push({ id: 'photo_explorer', name: 'Photo Explorer 🔭', earned: true });
  }
  if (stats.photosExplored >= 50) {
    achievements.push({ id: 'photo_master', name: 'Photo Master 🏆', earned: true });
  }
  
  // Question achievements
  if (stats.questionsAsked >= 1) {
    achievements.push({ id: 'first_question', name: 'Curious Mind! ❓', earned: true });
  }
  if (stats.questionsAsked >= 20) {
    achievements.push({ id: 'question_asker', name: 'Question Asker 🤔', earned: true });
  }
  if (stats.questionsAsked >= 100) {
    achievements.push({ id: 'super_curious', name: 'Super Curious 🌟', earned: true });
  }
  
  // Topic achievements
  if (stats.topicsDiscovered >= 5) {
    achievements.push({ id: 'topic_explorer', name: 'Topic Explorer 🗺️', earned: true });
  }
  if (stats.topicsDiscovered >= 20) {
    achievements.push({ id: 'knowledge_seeker', name: 'Knowledge Seeker 📚', earned: true });
  }
  
  // Streak achievements
  if (stats.currentStreak >= 3) {
    achievements.push({ id: 'streak_3', name: '3-Day Streak! 🔥', earned: true });
  }
  if (stats.currentStreak >= 7) {
    achievements.push({ id: 'streak_7', name: 'Week Warrior! 💪', earned: true });
  }
  
  return achievements;
}

module.exports = router;

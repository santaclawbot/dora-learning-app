/**
 * Database CRUD Operations for Dora Learning App
 * Provides persistence layer for: users, lessons, user_lessons, responses
 */

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

/**
 * USERS CRUD
 */
const Users = {
  // Create a new user
  async create(db, { telegram_id, email, name, password_hash, profile_pic }) {
    const sql = `
      INSERT INTO users (telegram_id, email, name, password_hash, profile_pic)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await promisify(db, 'run', sql, [telegram_id, email, name, password_hash, profile_pic]);
    return { id: result.lastID, telegram_id, email, name, profile_pic };
  },

  // Get user by ID
  async getById(db, id) {
    const sql = `SELECT * FROM users WHERE id = ?`;
    return promisify(db, 'get', sql, [id]);
  },

  // Get user by email
  async getByEmail(db, email) {
    const sql = `SELECT * FROM users WHERE email = ?`;
    return promisify(db, 'get', sql, [email]);
  },

  // Get user by Telegram ID
  async getByTelegramId(db, telegram_id) {
    const sql = `SELECT * FROM users WHERE telegram_id = ?`;
    return promisify(db, 'get', sql, [telegram_id]);
  },

  // Get all users
  async getAll(db, { limit = 100, offset = 0 } = {}) {
    const sql = `SELECT id, telegram_id, email, name, profile_pic, created_at, updated_at 
                 FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    return promisify(db, 'all', sql, [limit, offset]);
  },

  // Update user
  async update(db, id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.profile_pic !== undefined) { fields.push('profile_pic = ?'); values.push(updates.profile_pic); }
    if (updates.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(updates.password_hash); }
    
    if (fields.length === 0) return { changes: 0 };
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    return promisify(db, 'run', sql, values);
  },

  // Delete user
  async delete(db, id) {
    const sql = `DELETE FROM users WHERE id = ?`;
    return promisify(db, 'run', sql, [id]);
  }
};

/**
 * LESSONS CRUD
 */
const Lessons = {
  // Create a new lesson
  async create(db, { title, description, content, difficulty, duration_minutes, thumbnail_url }) {
    const sql = `
      INSERT INTO lessons (title, description, content, difficulty, duration_minutes, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await promisify(db, 'run', sql, [title, description, content, difficulty || 'Beginner', duration_minutes, thumbnail_url]);
    return { id: result.lastID, title, description, content, difficulty, duration_minutes, thumbnail_url };
  },

  // Get lesson by ID
  async getById(db, id) {
    const sql = `SELECT * FROM lessons WHERE id = ?`;
    return promisify(db, 'get', sql, [id]);
  },

  // Get all lessons
  async getAll(db, { limit = 100, offset = 0, difficulty } = {}) {
    let sql = `SELECT * FROM lessons`;
    const params = [];
    
    if (difficulty) {
      sql += ` WHERE difficulty = ?`;
      params.push(difficulty);
    }
    
    sql += ` ORDER BY id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    return promisify(db, 'all', sql, params);
  },

  // Update lesson
  async update(db, id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
    if (updates.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(updates.difficulty); }
    if (updates.duration_minutes !== undefined) { fields.push('duration_minutes = ?'); values.push(updates.duration_minutes); }
    if (updates.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); values.push(updates.thumbnail_url); }
    
    if (fields.length === 0) return { changes: 0 };
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`;
    return promisify(db, 'run', sql, values);
  },

  // Delete lesson
  async delete(db, id) {
    const sql = `DELETE FROM lessons WHERE id = ?`;
    return promisify(db, 'run', sql, [id]);
  },

  // Count lessons
  async count(db) {
    const sql = `SELECT COUNT(*) as count FROM lessons`;
    const row = await promisify(db, 'get', sql, []);
    return row.count;
  }
};

/**
 * USER_LESSONS CRUD (Progress tracking)
 */
const UserLessons = {
  // Create or update progress
  async upsert(db, { user_id, lesson_id, status, progress_percent, score }) {
    const sql = `
      INSERT INTO user_lessons (user_id, lesson_id, status, progress_percent, score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, lesson_id) 
      DO UPDATE SET status = excluded.status, 
                    progress_percent = excluded.progress_percent,
                    score = excluded.score,
                    completed_at = CASE WHEN excluded.status = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
    `;
    const result = await promisify(db, 'run', sql, [user_id, lesson_id, status || 'in_progress', progress_percent || 0, score]);
    return { user_id, lesson_id, status, progress_percent, score, id: result.lastID };
  },

  // Get progress for a user on a specific lesson
  async get(db, user_id, lesson_id) {
    const sql = `SELECT * FROM user_lessons WHERE user_id = ? AND lesson_id = ?`;
    return promisify(db, 'get', sql, [user_id, lesson_id]);
  },

  // Get all progress for a user
  async getByUser(db, user_id) {
    const sql = `
      SELECT ul.*, l.title as lesson_title, l.description as lesson_description
      FROM user_lessons ul
      JOIN lessons l ON ul.lesson_id = l.id
      WHERE ul.user_id = ?
      ORDER BY ul.created_at DESC
    `;
    return promisify(db, 'all', sql, [user_id]);
  },

  // Get all users who completed a lesson
  async getByLesson(db, lesson_id) {
    const sql = `
      SELECT ul.*, u.name as user_name
      FROM user_lessons ul
      JOIN users u ON ul.user_id = u.id
      WHERE ul.lesson_id = ? AND ul.status = 'completed'
      ORDER BY ul.completed_at DESC
    `;
    return promisify(db, 'all', sql, [lesson_id]);
  },

  // Mark lesson as completed
  async complete(db, user_id, lesson_id, score = null) {
    const sql = `
      INSERT INTO user_lessons (user_id, lesson_id, status, progress_percent, score, completed_at)
      VALUES (?, ?, 'completed', 100, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, lesson_id) 
      DO UPDATE SET status = 'completed', progress_percent = 100, score = excluded.score, completed_at = CURRENT_TIMESTAMP
    `;
    return promisify(db, 'run', sql, [user_id, lesson_id, score]);
  },

  // Update progress
  async updateProgress(db, user_id, lesson_id, progress_percent) {
    const status = progress_percent >= 100 ? 'completed' : 'in_progress';
    const sql = `
      UPDATE user_lessons 
      SET progress_percent = ?, status = ?, 
          completed_at = CASE WHEN ? >= 100 THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE user_id = ? AND lesson_id = ?
    `;
    return promisify(db, 'run', sql, [progress_percent, status, progress_percent, user_id, lesson_id]);
  },

  // Delete progress record
  async delete(db, user_id, lesson_id) {
    const sql = `DELETE FROM user_lessons WHERE user_id = ? AND lesson_id = ?`;
    return promisify(db, 'run', sql, [user_id, lesson_id]);
  },

  // Get stats for a user
  async getUserStats(db, user_id) {
    const sql = `
      SELECT 
        COUNT(*) as total_lessons_started,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as lessons_completed,
        AVG(CASE WHEN score IS NOT NULL THEN score ELSE NULL END) as average_score,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as completion_rate
      FROM user_lessons
      WHERE user_id = ?
    `;
    return promisify(db, 'get', sql, [user_id]);
  }
};

/**
 * RESPONSES CRUD (Exercise answers)
 */
const Responses = {
  // Create a response
  async create(db, { user_id, lesson_id, question_id, answer, is_correct }) {
    const sql = `
      INSERT INTO responses (user_id, lesson_id, question_id, answer, is_correct)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await promisify(db, 'run', sql, [user_id, lesson_id, question_id, answer, is_correct ? 1 : 0]);
    return { id: result.lastID, user_id, lesson_id, question_id, answer, is_correct };
  },

  // Get response by ID
  async getById(db, id) {
    const sql = `SELECT * FROM responses WHERE id = ?`;
    return promisify(db, 'get', sql, [id]);
  },

  // Get all responses for a user on a lesson
  async getByUserLesson(db, user_id, lesson_id) {
    const sql = `SELECT * FROM responses WHERE user_id = ? AND lesson_id = ? ORDER BY created_at ASC`;
    return promisify(db, 'all', sql, [user_id, lesson_id]);
  },

  // Get all responses for a user
  async getByUser(db, user_id, { limit = 100, offset = 0 } = {}) {
    const sql = `
      SELECT r.*, l.title as lesson_title
      FROM responses r
      JOIN lessons l ON r.lesson_id = l.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    return promisify(db, 'all', sql, [user_id, limit, offset]);
  },

  // Get response statistics for a lesson
  async getLessonStats(db, lesson_id) {
    const sql = `
      SELECT 
        question_id,
        COUNT(*) as total_responses,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_count,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as accuracy
      FROM responses
      WHERE lesson_id = ?
      GROUP BY question_id
    `;
    return promisify(db, 'all', sql, [lesson_id]);
  },

  // Update response
  async update(db, id, { answer, is_correct }) {
    const fields = [];
    const values = [];
    
    if (answer !== undefined) { fields.push('answer = ?'); values.push(answer); }
    if (is_correct !== undefined) { fields.push('is_correct = ?'); values.push(is_correct ? 1 : 0); }
    
    if (fields.length === 0) return { changes: 0 };
    values.push(id);
    
    const sql = `UPDATE responses SET ${fields.join(', ')} WHERE id = ?`;
    return promisify(db, 'run', sql, values);
  },

  // Delete response
  async delete(db, id) {
    const sql = `DELETE FROM responses WHERE id = ?`;
    return promisify(db, 'run', sql, [id]);
  },

  // Delete all responses for a user on a lesson (for retrying)
  async deleteByUserLesson(db, user_id, lesson_id) {
    const sql = `DELETE FROM responses WHERE user_id = ? AND lesson_id = ?`;
    return promisify(db, 'run', sql, [user_id, lesson_id]);
  },

  // Get accuracy for a user
  async getUserAccuracy(db, user_id) {
    const sql = `
      SELECT 
        COUNT(*) as total_responses,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_count,
        CASE WHEN COUNT(*) > 0 
             THEN SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*) 
             ELSE 0 END as accuracy
      FROM responses
      WHERE user_id = ?
    `;
    return promisify(db, 'get', sql, [user_id]);
  }
};

module.exports = {
  Users,
  Lessons,
  UserLessons,
  Responses
};

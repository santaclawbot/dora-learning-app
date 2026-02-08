/**
 * Test Setup for Dora Learning App
 * Creates in-memory SQLite database for testing
 */

const sqlite3 = require('sqlite3');

// Create in-memory database for tests
function createTestDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

// Initialize database schema
async function initializeTestSchema(db) {
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

    -- Dora conversations
    CREATE TABLE IF NOT EXISTS dora_conversations (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Dora messages
    CREATE TABLE IF NOT EXISTS dora_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES dora_conversations(id)
    );

    -- Photos table
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT,
      mimetype TEXT,
      size INTEGER,
      url TEXT,
      profile_id TEXT,
      lesson_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id)
    );

    -- Explorations table
    CREATE TABLE IF NOT EXISTS explorations (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      profile_id TEXT,
      type TEXT NOT NULL,
      content TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Topics discovered
    CREATE TABLE IF NOT EXISTS topics_discovered (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      profile_id TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      source TEXT,
      discovery_count INTEGER DEFAULT 1,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `;

  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Seed test data
async function seedTestData(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Seed users
      db.run(`INSERT INTO users (name, email, telegram_id) VALUES ('Test User', 'test@example.com', '12345')`);
      db.run(`INSERT INTO users (name, email, telegram_id) VALUES ('Another User', 'another@example.com', '67890')`);
      
      // Seed lessons
      db.run(`INSERT INTO lessons (title, description, content, difficulty, duration_minutes) VALUES ('Test Lesson 1', 'A test lesson', 'Content here', 'Easy', 10)`);
      db.run(`INSERT INTO lessons (title, description, content, difficulty, duration_minutes) VALUES ('Test Lesson 2', 'Another test', 'More content', 'Medium', 15)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Close database
function closeDatabase(db) {
  return new Promise((resolve) => {
    db.close(() => resolve());
  });
}

module.exports = {
  createTestDatabase,
  initializeTestSchema,
  seedTestData,
  closeDatabase
};

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DATABASE_URL || './data/dora.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('📦 Database connected');
  seedData();
});

function seedData() {
  // Sample lessons
  const lessons = [
    {
      title: 'Introduction to Learning',
      description: 'Get started with Dora and learn the basics',
      difficulty: 'Beginner',
      duration_minutes: 15
    },
    {
      title: 'Interactive Storytelling',
      description: 'Learn through engaging stories and dialogue',
      difficulty: 'Beginner',
      duration_minutes: 20
    },
    {
      title: 'Voice-Based Learning',
      description: 'Practice pronunciation and listening skills',
      difficulty: 'Intermediate',
      duration_minutes: 25
    }
  ];

  db.serialize(() => {
    // Check if lessons already exist
    db.get('SELECT COUNT(*) as count FROM lessons', (err, row) => {
      if (row && row.count > 0) {
        console.log('⏭️  Lessons already seeded, skipping...');
        db.close();
        return;
      }

      // Insert sample lessons
      const stmt = db.prepare(`
        INSERT INTO lessons (title, description, difficulty, duration_minutes)
        VALUES (?, ?, ?, ?)
      `);

      lessons.forEach((lesson) => {
        stmt.run(
          lesson.title,
          lesson.description,
          lesson.difficulty,
          lesson.duration_minutes,
          (err) => {
            if (err) console.error('Error inserting lesson:', err);
          }
        );
      });

      stmt.finalize(() => {
        console.log('✅ Sample lessons added to database');
        db.close();
      });
    });
  });
}

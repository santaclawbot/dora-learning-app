/**
 * CRUD Operations Tests
 * Tests for Users, Lessons, UserLessons, and Responses CRUD modules
 */

const { Users, Lessons, UserLessons, Responses } = require('../db/crud');
const { createTestDatabase, initializeTestSchema, seedTestData, closeDatabase } = require('./setup');

describe('CRUD Operations', () => {
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
    await initializeTestSchema(db);
  });

  afterAll(async () => {
    await closeDatabase(db);
  });

  // ==========================================
  // USERS CRUD TESTS
  // ==========================================
  describe('Users', () => {
    let testUserId;

    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        telegram_id: '123456'
      };

      const user = await Users.create(db, userData);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      testUserId = user.id;
    });

    it('should get user by ID', async () => {
      const user = await Users.getById(db, testUserId);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
      expect(user.name).toBe('Test User');
    });

    it('should get user by email', async () => {
      const user = await Users.getByEmail(db, 'test@example.com');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should get user by Telegram ID', async () => {
      const user = await Users.getByTelegramId(db, '123456');
      
      expect(user).toBeDefined();
      expect(user.telegram_id).toBe('123456');
    });

    it('should get all users', async () => {
      const users = await Users.getAll(db);
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should update user', async () => {
      const result = await Users.update(db, testUserId, { name: 'Updated User' });
      
      expect(result.changes).toBeGreaterThan(0);
      
      const user = await Users.getById(db, testUserId);
      expect(user.name).toBe('Updated User');
    });

    it('should delete user', async () => {
      // Create a user to delete
      const user = await Users.create(db, { name: 'To Delete', email: 'delete@test.com' });
      
      const result = await Users.delete(db, user.id);
      expect(result.changes).toBe(1);
      
      const deleted = await Users.getById(db, user.id);
      expect(deleted).toBeUndefined();
    });

    it('should return undefined for non-existent user', async () => {
      const user = await Users.getById(db, 99999);
      expect(user).toBeUndefined();
    });
  });

  // ==========================================
  // LESSONS CRUD TESTS
  // ==========================================
  describe('Lessons', () => {
    let testLessonId;

    it('should create a new lesson', async () => {
      const lessonData = {
        title: 'Test Lesson',
        description: 'A test lesson',
        content: 'Lesson content here',
        difficulty: 'Easy',
        duration_minutes: 15
      };

      const lesson = await Lessons.create(db, lessonData);
      
      expect(lesson).toBeDefined();
      expect(lesson.id).toBeDefined();
      expect(lesson.title).toBe('Test Lesson');
      testLessonId = lesson.id;
    });

    it('should get lesson by ID', async () => {
      const lesson = await Lessons.getById(db, testLessonId);
      
      expect(lesson).toBeDefined();
      expect(lesson.id).toBe(testLessonId);
      expect(lesson.title).toBe('Test Lesson');
    });

    it('should get all lessons', async () => {
      const lessons = await Lessons.getAll(db);
      
      expect(Array.isArray(lessons)).toBe(true);
      expect(lessons.length).toBeGreaterThan(0);
    });

    it('should filter lessons by difficulty', async () => {
      await Lessons.create(db, { title: 'Hard Lesson', difficulty: 'Hard' });
      
      const hardLessons = await Lessons.getAll(db, { difficulty: 'Hard' });
      
      expect(hardLessons.every(l => l.difficulty === 'Hard')).toBe(true);
    });

    it('should update lesson', async () => {
      const result = await Lessons.update(db, testLessonId, { title: 'Updated Lesson' });
      
      expect(result.changes).toBeGreaterThan(0);
      
      const lesson = await Lessons.getById(db, testLessonId);
      expect(lesson.title).toBe('Updated Lesson');
    });

    it('should count lessons', async () => {
      const count = await Lessons.count(db);
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should delete lesson', async () => {
      const lesson = await Lessons.create(db, { title: 'To Delete Lesson' });
      
      const result = await Lessons.delete(db, lesson.id);
      expect(result.changes).toBe(1);
      
      const deleted = await Lessons.getById(db, lesson.id);
      expect(deleted).toBeUndefined();
    });
  });

  // ==========================================
  // USER_LESSONS CRUD TESTS
  // ==========================================
  describe('UserLessons', () => {
    let userId;
    let lessonId;

    beforeAll(async () => {
      // Create user and lesson for progress tests
      const user = await Users.create(db, { name: 'Progress User', email: 'progress@test.com' });
      const lesson = await Lessons.create(db, { title: 'Progress Lesson' });
      userId = user.id;
      lessonId = lesson.id;
    });

    it('should upsert progress (create)', async () => {
      const progress = await UserLessons.upsert(db, {
        user_id: userId,
        lesson_id: lessonId,
        status: 'in_progress',
        progress_percent: 50
      });
      
      expect(progress).toBeDefined();
      expect(progress.user_id).toBe(userId);
      expect(progress.lesson_id).toBe(lessonId);
      expect(progress.progress_percent).toBe(50);
    });

    it('should get progress for user on lesson', async () => {
      const progress = await UserLessons.get(db, userId, lessonId);
      
      expect(progress).toBeDefined();
      expect(progress.status).toBe('in_progress');
    });

    it('should get all progress for user', async () => {
      const progress = await UserLessons.getByUser(db, userId);
      
      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBeGreaterThan(0);
    });

    it('should update progress', async () => {
      await UserLessons.updateProgress(db, userId, lessonId, 75);
      
      const progress = await UserLessons.get(db, userId, lessonId);
      expect(progress.progress_percent).toBe(75);
    });

    it('should mark lesson as completed', async () => {
      await UserLessons.complete(db, userId, lessonId, 95);
      
      const progress = await UserLessons.get(db, userId, lessonId);
      expect(progress.status).toBe('completed');
      expect(progress.progress_percent).toBe(100);
      expect(progress.score).toBe(95);
    });

    it('should get user stats', async () => {
      const stats = await UserLessons.getUserStats(db, userId);
      
      expect(stats).toBeDefined();
      expect(stats.total_lessons_started).toBeGreaterThan(0);
    });

    it('should delete progress', async () => {
      const result = await UserLessons.delete(db, userId, lessonId);
      expect(result.changes).toBe(1);
      
      const progress = await UserLessons.get(db, userId, lessonId);
      expect(progress).toBeUndefined();
    });
  });

  // ==========================================
  // RESPONSES CRUD TESTS
  // ==========================================
  describe('Responses', () => {
    let userId;
    let lessonId;
    let responseId;

    beforeAll(async () => {
      const user = await Users.create(db, { name: 'Response User', email: 'response@test.com' });
      const lesson = await Lessons.create(db, { title: 'Response Lesson' });
      userId = user.id;
      lessonId = lesson.id;
    });

    it('should create a response', async () => {
      const response = await Responses.create(db, {
        user_id: userId,
        lesson_id: lessonId,
        question_id: 1,
        answer: 'Blue',
        is_correct: true
      });
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.answer).toBe('Blue');
      expect(response.is_correct).toBe(true);
      responseId = response.id;
    });

    it('should get response by ID', async () => {
      const response = await Responses.getById(db, responseId);
      
      expect(response).toBeDefined();
      expect(response.id).toBe(responseId);
    });

    it('should get responses by user and lesson', async () => {
      // Add more responses
      await Responses.create(db, {
        user_id: userId,
        lesson_id: lessonId,
        question_id: 2,
        answer: 'Red',
        is_correct: false
      });
      
      const responses = await Responses.getByUserLesson(db, userId, lessonId);
      
      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBe(2);
    });

    it('should get responses by user', async () => {
      const responses = await Responses.getByUser(db, userId);
      
      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should get lesson statistics', async () => {
      const stats = await Responses.getLessonStats(db, lessonId);
      
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should get user accuracy', async () => {
      const accuracy = await Responses.getUserAccuracy(db, userId);
      
      expect(accuracy).toBeDefined();
      expect(accuracy.total_responses).toBe(2);
      expect(accuracy.correct_count).toBe(1);
      expect(accuracy.accuracy).toBe(50);
    });

    it('should update response', async () => {
      const result = await Responses.update(db, responseId, { 
        answer: 'Green', 
        is_correct: false 
      });
      
      expect(result.changes).toBeGreaterThan(0);
      
      const response = await Responses.getById(db, responseId);
      expect(response.answer).toBe('Green');
    });

    it('should delete responses by user and lesson', async () => {
      const result = await Responses.deleteByUserLesson(db, userId, lessonId);
      expect(result.changes).toBeGreaterThan(0);
      
      const responses = await Responses.getByUserLesson(db, userId, lessonId);
      expect(responses.length).toBe(0);
    });
  });
});

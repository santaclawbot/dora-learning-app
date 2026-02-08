/**
 * API Endpoint Tests
 * Tests for all REST API endpoints
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createTestDatabase, initializeTestSchema, seedTestData, closeDatabase } = require('./setup');

// Import routes
const crudRoutes = require('../routes/crud');
const progressRoutes = require('../routes/progress');

const JWT_SECRET = 'test-secret-key';

describe('API Endpoints', () => {
  let db;
  let app;
  let authToken;
  let testUserId;
  let testLessonId;

  beforeAll(async () => {
    // Create test database
    db = await createTestDatabase();
    await initializeTestSchema(db);
    await seedTestData(db);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.set('db', db);

    // Mount routes
    app.use('/api/crud', crudRoutes);
    app.use('/api/progress', progressRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Generate auth token for tests
    authToken = jwt.sign({ id: 1, username: 'testuser', name: 'Test User' }, JWT_SECRET);
    testUserId = 1;
    testLessonId = 1;
  });

  afterAll(async () => {
    await closeDatabase(db);
  });

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  // ==========================================
  // USERS API
  // ==========================================
  describe('Users API', () => {
    describe('GET /api/crud/users', () => {
      it('should get all users', async () => {
        const response = await request(app).get('/api/crud/users');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.users)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/crud/users')
          .query({ limit: 1, offset: 0 });
        
        expect(response.status).toBe(200);
        expect(response.body.users.length).toBeLessThanOrEqual(1);
      });
    });

    describe('GET /api/crud/users/:id', () => {
      it('should get user by ID', async () => {
        const response = await request(app).get('/api/crud/users/1');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user).toBeDefined();
      });

      it('should return 404 for non-existent user', async () => {
        const response = await request(app).get('/api/crud/users/99999');
        
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/crud/users', () => {
      it('should create a new user', async () => {
        const response = await request(app)
          .post('/api/crud/users')
          .send({ name: 'New API User', email: 'api@test.com' });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user.name).toBe('New API User');
      });

      it('should require name field', async () => {
        const response = await request(app)
          .post('/api/crud/users')
          .send({ email: 'noname@test.com' });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/crud/users/:id', () => {
      it('should update user', async () => {
        const response = await request(app)
          .put('/api/crud/users/1')
          .send({ name: 'Updated via API' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.name).toBe('Updated via API');
      });
    });

    describe('DELETE /api/crud/users/:id', () => {
      it('should delete user', async () => {
        // Create user to delete
        const createRes = await request(app)
          .post('/api/crud/users')
          .send({ name: 'To Delete' });
        
        const userId = createRes.body.user.id;
        
        const response = await request(app).delete(`/api/crud/users/${userId}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.deleted).toBe(true);
      });
    });
  });

  // ==========================================
  // LESSONS API
  // ==========================================
  describe('Lessons API', () => {
    describe('GET /api/crud/lessons', () => {
      it('should get all lessons', async () => {
        const response = await request(app).get('/api/crud/lessons');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.lessons)).toBe(true);
        expect(response.body.total).toBeDefined();
      });

      it('should filter by difficulty', async () => {
        const response = await request(app)
          .get('/api/crud/lessons')
          .query({ difficulty: 'Easy' });
        
        expect(response.status).toBe(200);
        // All returned lessons should be Easy difficulty
        response.body.lessons.forEach(lesson => {
          expect(lesson.difficulty).toBe('Easy');
        });
      });
    });

    describe('GET /api/crud/lessons/:id', () => {
      it('should get lesson by ID', async () => {
        const response = await request(app).get('/api/crud/lessons/1');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.lesson).toBeDefined();
      });

      it('should return 404 for non-existent lesson', async () => {
        const response = await request(app).get('/api/crud/lessons/99999');
        
        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/crud/lessons', () => {
      it('should create a new lesson', async () => {
        const response = await request(app)
          .post('/api/crud/lessons')
          .send({
            title: 'API Test Lesson',
            description: 'Created via API',
            difficulty: 'Medium',
            duration_minutes: 20
          });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.lesson.title).toBe('API Test Lesson');
        testLessonId = response.body.lesson.id;
      });

      it('should require title field', async () => {
        const response = await request(app)
          .post('/api/crud/lessons')
          .send({ description: 'No title' });
        
        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/crud/lessons/:id', () => {
      it('should update lesson', async () => {
        const response = await request(app)
          .put(`/api/crud/lessons/${testLessonId}`)
          .send({ title: 'Updated Lesson Title' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/crud/lessons/:id', () => {
      it('should delete lesson', async () => {
        // Create lesson to delete
        const createRes = await request(app)
          .post('/api/crud/lessons')
          .send({ title: 'To Delete Lesson' });
        
        const lessonId = createRes.body.lesson.id;
        
        const response = await request(app).delete(`/api/crud/lessons/${lessonId}`);
        
        expect(response.status).toBe(200);
        expect(response.body.deleted).toBe(true);
      });
    });
  });

  // ==========================================
  // PROGRESS API
  // ==========================================
  describe('Progress API', () => {
    describe('GET /api/crud/progress/:userId', () => {
      it('should get progress for user', async () => {
        const response = await request(app).get('/api/crud/progress/1');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.progress)).toBe(true);
        expect(response.body.stats).toBeDefined();
      });
    });

    describe('POST /api/crud/progress', () => {
      it('should create/update progress', async () => {
        const response = await request(app)
          .post('/api/crud/progress')
          .send({
            user_id: 1,
            lesson_id: 1,
            status: 'in_progress',
            progress_percent: 50
          });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should require user_id and lesson_id', async () => {
        const response = await request(app)
          .post('/api/crud/progress')
          .send({ status: 'in_progress' });
        
        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/crud/progress/:userId/:lessonId', () => {
      it('should update progress percentage', async () => {
        // First create progress
        await request(app)
          .post('/api/crud/progress')
          .send({ user_id: 1, lesson_id: 1, progress_percent: 25 });
        
        const response = await request(app)
          .put('/api/crud/progress/1/1')
          .send({ progress_percent: 75 });
        
        expect(response.status).toBe(200);
        expect(response.body.progress.progress_percent).toBe(75);
      });
    });

    describe('POST /api/crud/progress/:userId/:lessonId/complete', () => {
      it('should mark lesson as complete', async () => {
        const response = await request(app)
          .post('/api/crud/progress/1/1/complete')
          .send({ score: 100 });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.progress.status).toBe('completed');
      });
    });
  });

  // ==========================================
  // RESPONSES API
  // ==========================================
  describe('Responses API', () => {
    describe('POST /api/crud/responses', () => {
      it('should create a response', async () => {
        const response = await request(app)
          .post('/api/crud/responses')
          .send({
            user_id: 1,
            lesson_id: 1,
            question_id: 1,
            answer: 'Test Answer',
            is_correct: true
          });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.response.answer).toBe('Test Answer');
      });
    });

    describe('GET /api/crud/responses/user/:userId', () => {
      it('should get responses for user', async () => {
        const response = await request(app).get('/api/crud/responses/user/1');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.responses)).toBe(true);
        expect(response.body.accuracy).toBeDefined();
      });
    });

    describe('GET /api/crud/responses/:userId/:lessonId', () => {
      it('should get responses for user on lesson', async () => {
        const response = await request(app).get('/api/crud/responses/1/1');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.responses)).toBe(true);
      });
    });

    describe('GET /api/crud/responses/lesson/:lessonId/stats', () => {
      it('should get lesson statistics', async () => {
        const response = await request(app).get('/api/crud/responses/lesson/1/stats');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.stats)).toBe(true);
      });
    });
  });

  // ==========================================
  // PROGRESS TRACKING API (from progress.js routes)
  // ==========================================
  describe('Progress Tracking API', () => {
    describe('POST /api/progress/exploration', () => {
      it('should track an exploration', async () => {
        const response = await request(app)
          .post('/api/progress/exploration')
          .send({
            userId: 1,
            profileId: 'test-profile',
            type: 'photo',
            content: 'A cool photo',
            metadata: { tags: ['nature'] }
          });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.exploration).toBeDefined();
      });

      it('should require type and content', async () => {
        const response = await request(app)
          .post('/api/progress/exploration')
          .send({ userId: 1 });
        
        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/progress/explorations/:profileId', () => {
      it('should get explorations for profile', async () => {
        const response = await request(app).get('/api/progress/explorations/test-profile');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.explorations)).toBe(true);
      });

      it('should filter by type', async () => {
        const response = await request(app)
          .get('/api/progress/explorations/test-profile')
          .query({ type: 'photo' });
        
        expect(response.status).toBe(200);
        response.body.explorations.forEach(exp => {
          expect(exp.type).toBe('photo');
        });
      });
    });

    describe('POST /api/progress/topic', () => {
      it('should track a topic discovery', async () => {
        const response = await request(app)
          .post('/api/progress/topic')
          .send({
            userId: 1,
            profileId: 'test-profile',
            topicName: 'Dinosaurs',
            source: 'question'
          });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.isNew).toBe(true);
      });

      it('should increment count for existing topic', async () => {
        // First discovery
        await request(app)
          .post('/api/progress/topic')
          .send({
            profileId: 'test-profile',
            topicName: 'Space',
            source: 'photo'
          });
        
        // Second discovery
        const response = await request(app)
          .post('/api/progress/topic')
          .send({
            profileId: 'test-profile',
            topicName: 'Space',
            source: 'question'
          });
        
        expect(response.body.isNew).toBe(false);
        expect(response.body.topic.discovery_count).toBeGreaterThan(1);
      });
    });

    describe('GET /api/progress/topics/:profileId', () => {
      it('should get topics for profile', async () => {
        const response = await request(app).get('/api/progress/topics/test-profile');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.topics)).toBe(true);
      });
    });

    describe('GET /api/progress/dashboard/:profileId', () => {
      it('should get dashboard for profile', async () => {
        const response = await request(app).get('/api/progress/dashboard/test-profile');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.dashboard).toBeDefined();
        expect(response.body.dashboard.summary).toBeDefined();
        expect(response.body.dashboard.achievements).toBeDefined();
      });
    });

    describe('GET /api/progress/timeline/:profileId', () => {
      it('should get timeline for profile', async () => {
        const response = await request(app)
          .get('/api/progress/timeline/test-profile')
          .query({ days: 7 });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.timeline)).toBe(true);
      });
    });
  });
});

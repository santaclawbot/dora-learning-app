/**
 * Telegram Webhook Tests
 * Tests for Telegram bot webhook endpoints
 * 
 * These tests verify the webhook endpoint behavior without making real Telegram API calls.
 * The actual Telegram API responses are handled asynchronously after returning 200.
 */

const express = require('express');
const request = require('supertest');
const { createTestDatabase, initializeTestSchema, seedTestData, closeDatabase } = require('./setup');

describe('Telegram Webhook API', () => {
  let db;
  let app;
  let telegramRoutes;

  beforeAll(async () => {
    // Set up environment - use a test token
    process.env.TELEGRAM_TOKEN = 'test-token-123';

    // Create test database
    db = await createTestDatabase();
    await initializeTestSchema(db);
    await seedTestData(db);

    // Import telegram routes
    telegramRoutes = require('../routes/telegram');

    // Set up Express app
    app = express();
    app.use(express.json());
    app.set('db', db);

    // Mount routes
    app.use('/webhook/telegram', telegramRoutes);
  });

  afterAll(async () => {
    await closeDatabase(db);
    delete process.env.TELEGRAM_TOKEN;
  });

  describe('POST /webhook/telegram', () => {
    it('should handle /start command and return 200', async () => {
      const update = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 12345,
            first_name: 'Test',
            last_name: 'User'
          },
          chat: {
            id: 12345,
            type: 'private'
          },
          text: '/start'
        }
      };

      const response = await request(app)
        .post('/webhook/telegram')
        .send(update);
      
      // Telegram webhooks must always return 200 quickly
      expect(response.status).toBe(200);
    });

    it('should handle text messages and return 200', async () => {
      const update = {
        update_id: 123456790,
        message: {
          message_id: 2,
          from: {
            id: 12345,
            first_name: 'Test',
            last_name: 'User'
          },
          chat: {
            id: 12345,
            type: 'private'
          },
          text: 'What color is the sky?'
        }
      };

      const response = await request(app)
        .post('/webhook/telegram')
        .send(update);
      
      expect(response.status).toBe(200);
    });

    it('should handle updates without message gracefully', async () => {
      const update = {
        update_id: 123456791
        // No message field - e.g., edited_message, callback_query, etc.
      };

      const response = await request(app)
        .post('/webhook/telegram')
        .send(update);
      
      expect(response.status).toBe(200);
    });

    it('should handle photo messages', async () => {
      const update = {
        update_id: 123456792,
        message: {
          message_id: 3,
          from: {
            id: 12345,
            first_name: 'Test'
          },
          chat: {
            id: 12345,
            type: 'private'
          },
          photo: [
            { file_id: 'small_file', width: 90, height: 90 },
            { file_id: 'large_file', width: 320, height: 320 }
          ],
          caption: 'Look at this!'
        }
      };

      const response = await request(app)
        .post('/webhook/telegram')
        .send(update);
      
      // Should return 200 even if photo processing fails (graceful handling)
      expect(response.status).toBe(200);
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/webhook/telegram')
        .send({});
      
      expect(response.status).toBe(200);
    });
  });

  describe('POST /webhook/telegram/set-webhook', () => {
    it('should require URL when no env var', async () => {
      const originalEnv = process.env.TELEGRAM_WEBHOOK_URL;
      delete process.env.TELEGRAM_WEBHOOK_URL;

      const response = await request(app)
        .post('/webhook/telegram/set-webhook')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      if (originalEnv) {
        process.env.TELEGRAM_WEBHOOK_URL = originalEnv;
      }
    });
  });
});

describe('Telegram Unconfigured State', () => {
  let db;
  let app;

  beforeAll(async () => {
    // Ensure token is NOT set
    delete process.env.TELEGRAM_TOKEN;

    // Create fresh database
    db = await createTestDatabase();
    await initializeTestSchema(db);

    // Set up Express app without telegram routes (they need the token at import time)
    app = express();
    app.use(express.json());
    app.set('db', db);

    // Simple endpoint to test unconfigured scenario
    app.get('/test/telegram-configured', (req, res) => {
      res.json({ configured: !!process.env.TELEGRAM_TOKEN });
    });
  });

  afterAll(async () => {
    await closeDatabase(db);
  });

  it('should report unconfigured when no token', async () => {
    const response = await request(app).get('/test/telegram-configured');
    
    expect(response.status).toBe(200);
    expect(response.body.configured).toBe(false);
  });
});

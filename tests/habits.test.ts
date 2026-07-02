import { cleanupDatabases, createTestUser } from './setup/db.helpers.ts';
import request from 'supertest';
import server from '../src/server.ts';

describe('Habits API', () => {
  afterEach(async () => {
    await cleanupDatabases();
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const { token } = await createTestUser();

      const response = await request(server)
        .post('/api/habits')
        .set('authorization', `Bearer ${token}`)
        .send({
          name: 'Exercise daily',
          description: 'Daily exercise routine',
          frequency: 'daily',
          targetCount: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.habit).toBeDefined();
      expect(response.body.habit.name).toBe('Exercise daily');
    });
  });
  // ...
});

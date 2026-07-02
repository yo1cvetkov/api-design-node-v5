import request from 'supertest';
import server from '../src/server.ts';
import { cleanupDatabases, createTestUser } from './setup/db.helpers.ts';

describe('Authentication Endpoints', () => {
  afterEach(async () => {
    await cleanupDatabases();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'test@email.com',
        username: 'testuser',
        password: 'password123',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: `testuser-${Date.now()}`,
        password: 'TestPassword123!',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for short password', async () => {
      const userData = {
        email: `testuser@email.com`,
        username: 'testuser123',
        password: 'short',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = await createTestUser();

      const loginData = {
        email: mockUser.user.email,
        password: mockUser.rawPassword,
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for missing email', async () => {
      const credentials = {
        password: 'TestPassword123!',
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 401 for invalid credentials', async () => {
      const { user } = await createTestUser();

      const credentials = {
        email: user.email,
        password: 'wrongpassword',
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});

const request = require('supertest');
const app = require('../src/app');
const { clearStore, users } = require('../src/data/store');
const { sentEmails, clearSentEmails } = require('../src/services/emailService');

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    clearStore();
    clearSentEmails();
  });

  describe('POST /register', () => {
    it('should successfully register a new attendee user and send email', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'attendee'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(res.body.user).toHaveProperty('username', 'testuser');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.user).toHaveProperty('role', 'attendee');
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Verify user added in store
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('testuser');

      // Verify email was sent
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('test@example.com');
      expect(sentEmails[0].subject).toContain('Welcome');
    });

    it('should default to attendee role if not specified', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('attendee');
    });

    it('should allow registering as an organizer', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          username: 'organizer1',
          email: 'org@example.com',
          password: 'password123',
          role: 'organizer'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('organizer');
    });

    it('should block registration with invalid role option', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          username: 'adminuser',
          email: 'admin@example.com',
          password: 'password123',
          role: 'admin' // invalid role
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should fail registration with missing fields', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          username: 'user'
          // missing email and password
        });

      expect(res.status).toBe(400);
    });

    it('should block duplicate email registration', async () => {
      // Register first user
      await request(app)
        .post('/register')
        .send({
          username: 'first',
          email: 'duplicate@example.com',
          password: 'password123'
        });

      // Register second user with same email
      const res = await request(app)
        .post('/register')
        .send({
          username: 'second',
          email: 'duplicate@example.com',
          password: 'password999'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already registered');
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Seed a user for login testing
      await request(app)
        .post('/register')
        .send({
          username: 'loginuser',
          email: 'login@example.com',
          password: 'mypassword',
          role: 'attendee'
        });
    });

    it('should log in with valid credentials and return a token', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'login@example.com',
          password: 'mypassword'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'login@example.com');
    });

    it('should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty('token');
    });

    it('should fail login for non-existent email', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'unknown@example.com',
          password: 'mypassword'
        });

      expect(res.status).toBe(401);
    });
  });
});

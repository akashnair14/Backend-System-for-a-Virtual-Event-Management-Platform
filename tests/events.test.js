const request = require('supertest');
const app = require('../src/app');
const { clearStore } = require('../src/data/store');
const { sentEmails, clearSentEmails } = require('../src/services/emailService');

describe('Event and Registration Endpoints', () => {
  let organizerToken;
  let organizer2Token;
  let attendeeToken;
  let attendee2Token;
  let eventId;

  beforeAll(async () => {
    // We register and login all users once at the beginning or refresh them in beforeEach.
    // Refreshing inside beforeEach is cleaner because it resets memory.
  });

  beforeEach(async () => {
    clearStore();
    clearSentEmails();

    // Register & login Organizer 1
    await request(app).post('/register').send({
      username: 'organizer1',
      email: 'org1@example.com',
      password: 'password123',
      role: 'organizer'
    });
    let loginRes = await request(app).post('/login').send({
      email: 'org1@example.com',
      password: 'password123'
    });
    organizerToken = loginRes.body.token;

    // Register & login Organizer 2
    await request(app).post('/register').send({
      username: 'organizer2',
      email: 'org2@example.com',
      password: 'password123',
      role: 'organizer'
    });
    loginRes = await request(app).post('/login').send({
      email: 'org2@example.com',
      password: 'password123'
    });
    organizer2Token = loginRes.body.token;

    // Register & login Attendee 1
    await request(app).post('/register').send({
      username: 'attendee1',
      email: 'att1@example.com',
      password: 'password123',
      role: 'attendee'
    });
    loginRes = await request(app).post('/login').send({
      email: 'att1@example.com',
      password: 'password123'
    });
    attendeeToken = loginRes.body.token;

    // Register & login Attendee 2
    await request(app).post('/register').send({
      username: 'attendee2',
      email: 'att2@example.com',
      password: 'password123',
      role: 'attendee'
    });
    loginRes = await request(app).post('/login').send({
      email: 'att2@example.com',
      password: 'password123'
    });
    attendee2Token = loginRes.body.token;

    // Create a base event for testing updates/registration
    const eventRes = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Initial Event',
        description: 'Initial description',
        date: '2026-08-01',
        time: '18:00',
        capacity: 2
      });
    eventId = eventRes.body.event.id;
  });

  describe('POST /events (Create Event)', () => {
    it('should allow organizer to create an event', async () => {
      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'New Event',
          description: 'A brand new event',
          date: '2026-09-01',
          time: '10:00',
          capacity: 50
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Event created successfully');
      expect(res.body.event).toHaveProperty('title', 'New Event');
    });

    it('should restrict attendees from creating an event', async () => {
      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          title: 'Illegal Event',
          description: 'Should fail',
          date: '2026-09-01',
          time: '10:00'
        });

      expect(res.status).toBe(403);
    });

    it('should fail with invalid parameters', async () => {
      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: '', // empty title
          date: '2026-09-01'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /events and /events/:id', () => {
    it('should allow authenticated users to fetch all events', async () => {
      const res = await request(app)
        .get('/events')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('should allow authenticated users to fetch single event details with organizer and participants', async () => {
      const res = await request(app)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Initial Event');
      expect(res.body).toHaveProperty('organizer');
      expect(res.body.organizer).toHaveProperty('username', 'organizer1');
      expect(res.body).toHaveProperty('participants');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .get('/events/non_existent_id')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /events/:id (Update Event)', () => {
    it('should allow the creator organizer to update the event', async () => {
      const res = await request(app)
        .put(`/events/${eventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Updated Event Title',
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
      expect(res.body.event).toHaveProperty('title', 'Updated Event Title');
      expect(res.body.event).toHaveProperty('description', 'Updated description');
    });

    it('should prevent non-creator organizers from updating the event', async () => {
      const res = await request(app)
        .put(`/events/${eventId}`)
        .set('Authorization', `Bearer ${organizer2Token}`)
        .send({
          title: 'Hack attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should prevent attendees from updating the event', async () => {
      const res = await request(app)
        .put(`/events/${eventId}`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          title: 'Attendee Hack'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /events/:id (Delete Event)', () => {
    it('should allow the creator organizer to delete the event', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');

      // Verify it's gone
      const checkRes = await request(app)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(checkRes.status).toBe(404);
    });

    it('should prevent non-creator organizers from deleting the event', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${organizer2Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /events/:id/register (Register for Event)', () => {
    it('should allow an attendee to register and send an email', async () => {
      // Clear registration email from previous setup registering users
      clearSentEmails();

      const res = await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Successfully registered');

      // Verify registration email
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('att1@example.com');
      expect(sentEmails[0].subject).toContain('Registration Confirmation');
    });

    it('should prevent double registration', async () => {
      // First registration
      await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      // Second registration
      const res = await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already registered');
    });

    it('should block registration when capacity is exceeded', async () => {
      // Register Attendee 1 (Capacity is 2)
      await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      // Register Attendee 2
      await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      // Register a third attendee (needs to register/login first)
      await request(app).post('/register').send({
        username: 'attendee3',
        email: 'att3@example.com',
        password: 'password123',
        role: 'attendee'
      });
      const loginRes = await request(app).post('/login').send({
        email: 'att3@example.com',
        password: 'password123'
      });
      const attendee3Token = loginRes.body.token;

      const res = await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendee3Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('fully booked');
    });

    it('should prevent organizers from registering for events', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /events/my-registrations', () => {
    it('should retrieve registered events for the attendee', async () => {
      // Register Attendee 1
      await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      const res = await request(app)
        .get('/events/my-registrations')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Initial Event');
    });
  });

  describe('DELETE /events/:id/register (Cancel Registration)', () => {
    it('should allow attendee to cancel registration and send cancellation email', async () => {
      // Register first
      await request(app)
        .post(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      clearSentEmails();

      const res = await request(app)
        .delete(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled successfully');

      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('att1@example.com');
      expect(sentEmails[0].subject).toContain('Cancellation');
    });

    it('should fail if attendee is not registered for the event', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not registered');
    });
  });
});

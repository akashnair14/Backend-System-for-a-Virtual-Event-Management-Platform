const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const authController = require('./controllers/authController');
const eventController = require('./controllers/eventController');
const { authenticateJWT, requireRole } = require('./middlewares/authMiddleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Virtual Event Management API!' });
});

app.post('/register', authController.register);
app.post('/login', authController.login);

app.post('/events', authenticateJWT, requireRole('organizer'), eventController.createEvent);
app.put('/events/:id', authenticateJWT, requireRole('organizer'), eventController.updateEvent);
app.delete('/events/:id', authenticateJWT, requireRole('organizer'), eventController.deleteEvent);

app.get('/events', authenticateJWT, eventController.getEvents);
app.get('/events/my-registrations', authenticateJWT, requireRole('attendee'), eventController.getMyRegistrations);
app.get('/events/:id', authenticateJWT, eventController.getEventById);

app.post('/events/:id/register', authenticateJWT, requireRole('attendee'), eventController.registerForEvent);
app.delete('/events/:id/register', authenticateJWT, requireRole('attendee'), eventController.cancelRegistration);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;

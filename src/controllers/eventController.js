const { events, users } = require('../data/store');
const { sendEmail } = require('../services/emailService');

const createEvent = async (req, res) => {
  try {
    const { title, description, date, time, capacity } = req.body;

    if (!title || !description || !date || !time) {
      return res.status(400).json({ message: 'Title, description, date, and time are required' });
    }

    const eventCapacity = parseInt(capacity, 10);
    if (capacity !== undefined && (isNaN(eventCapacity) || eventCapacity <= 0)) {
      return res.status(400).json({ message: 'Capacity must be a positive number' });
    }

    const newEvent = {
      id: String(events.length + 1),
      title: title.trim(),
      description: description.trim(),
      date: date.trim(),
      time: time.trim(),
      capacity: isNaN(eventCapacity) ? 50 : eventCapacity,
      createdBy: req.user.id,
      participants: []
    };

    events.push(newEvent);
    return res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getEvents = async (req, res) => {
  try {
    const eventsList = events.map(event => {
      const organizer = users.find(u => u.id === event.createdBy);
      return {
        ...event,
        organizer: organizer ? { id: organizer.id, username: organizer.username, email: organizer.email } : null
      };
    });
    return res.status(200).json(eventsList);
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = events.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const organizer = users.find(u => u.id === event.createdBy);
    const populatedParticipants = event.participants.map(pId => {
      const attendee = users.find(u => u.id === pId);
      return attendee ? { id: attendee.id, username: attendee.username, email: attendee.email } : null;
    }).filter(Boolean);

    return res.status(200).json({
      ...event,
      organizer: organizer ? { id: organizer.id, username: organizer.username, email: organizer.email } : null,
      participants: populatedParticipants
    });
  } catch (error) {
    console.error('Get event error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, capacity } = req.body;

    const eventIndex = events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[eventIndex];
    if (event.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only update events created by you.' });
    }

    if (capacity !== undefined) {
      const eventCapacity = parseInt(capacity, 10);
      if (isNaN(eventCapacity) || eventCapacity <= 0) {
        return res.status(400).json({ message: 'Capacity must be a positive number' });
      }
      if (eventCapacity < event.participants.length) {
        return res.status(400).json({ message: `Cannot reduce capacity below currently registered participants (${event.participants.length})` });
      }
      event.capacity = eventCapacity;
    }

    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (date) event.date = date.trim();
    if (time) event.time = time.trim();

    return res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventIndex = events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[eventIndex];
    if (event.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only delete events created by you.' });
    }

    events.splice(eventIndex, 1);
    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = events.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isAlreadyRegistered = event.participants.includes(req.user.id);
    if (isAlreadyRegistered) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    if (event.participants.length >= event.capacity) {
      return res.status(400).json({ message: 'Event is fully booked' });
    }

    event.participants.push(req.user.id);

    sendEmail(
      req.user.email,
      'Event Registration Confirmation',
      `Hello ${req.user.username},\n\nThis is to confirm your registration for the event: "${event.title}".\n\nEvent Details:\nDate: ${event.date}\nTime: ${event.time}\nDescription: ${event.description}\n\nThank you for registering!\n\nBest regards,\nVirtual Event Management Team`
    ).catch(err => console.error('Error sending registration confirmation email:', err));

    return res.status(200).json({
      message: 'Successfully registered for the event',
      event: { id: event.id, title: event.title, date: event.date, time: event.time }
    });
  } catch (error) {
    console.error('Event registration error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getMyRegistrations = async (req, res) => {
  try {
    const registeredEvents = events.filter(event => event.participants.includes(req.user.id));
    const responseList = registeredEvents.map(event => {
      const organizer = users.find(u => u.id === event.createdBy);
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        organizer: organizer ? { id: organizer.id, username: organizer.username, email: organizer.email } : null
      };
    });
    return res.status(200).json(responseList);
  } catch (error) {
    console.error('Get my registrations error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const event = events.find(e => e.id === id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const participantIndex = event.participants.indexOf(req.user.id);
    if (participantIndex === -1) {
      return res.status(400).json({ message: 'You are not registered for this event' });
    }

    event.participants.splice(participantIndex, 1);

    sendEmail(
      req.user.email,
      'Event Registration Cancellation',
      `Hello ${req.user.username},\n\nYou have successfully cancelled your registration for the event: "${event.title}".\n\nIf this was a mistake, you can register again before the event capacity is reached.\n\nBest regards,\nVirtual Event Management Team`
    ).catch(err => console.error('Error sending cancellation email:', err));

    return res.status(200).json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Cancel registration error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getMyRegistrations,
  cancelRegistration
};

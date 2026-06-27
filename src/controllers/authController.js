const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { users } = require('../data/store');
const { sendEmail } = require('../services/emailService');

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = users.find(u => u.email === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    let userRole = 'attendee';
    if (role) {
      const normalizedRole = role.toLowerCase().trim();
      if (normalizedRole !== 'attendee' && normalizedRole !== 'organizer') {
        return res.status(400).json({ message: "Role must be either 'attendee' or 'organizer'" });
      }
      userRole = normalizedRole;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
      id: String(users.length + 1),
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
      role: userRole
    };

    users.push(newUser);

    sendEmail(
      newUser.email,
      'Welcome to Virtual Event Platform!',
      `Hello ${newUser.username},\n\nWelcome to our platform! Your registration was successful as an "${newUser.role}".\n\nEnjoy the platform!\n\nBest regards,\nVirtual Event Management Team`
    ).catch(err => console.error('Error sending registration email:', err));

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  register,
  login
};

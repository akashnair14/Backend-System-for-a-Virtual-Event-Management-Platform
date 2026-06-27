const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkeyforeventsmanagement',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

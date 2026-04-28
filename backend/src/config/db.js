const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

const connectDB = async (retries = MAX_RETRIES) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8.x has these on by default, but explicit is better
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);

    if (retries > 0) {
      logger.info(`Retrying in ${RETRY_INTERVAL_MS / 1000}s... (${retries} retries left)`);
      await new Promise((res) => setTimeout(res, RETRY_INTERVAL_MS));
      return connectDB(retries - 1);
    }

    logger.error('Max retries reached. Exiting.');
    process.exit(1);
  }
};

module.exports = connectDB;
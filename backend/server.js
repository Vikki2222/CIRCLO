require('dotenv').config();

const { validateEnv } = require('./src/config/env');
const connectDB       = require('./src/config/db');
const logger          = require('./src/utils/logger');

validateEnv();

const http     = require('http');
const app      = require('./src/app');
const initSocket = require('./src/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Create HTTP server from Express app
  const server = http.createServer(app);

  // Attach Socket.io to the HTTP server
  const io = initSocket(server);
  global.io = io;

  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info('Socket.io initialized');
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`, err);
    shutdown('unhandledRejection');
  });
};

startServer();
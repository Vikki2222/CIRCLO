require('dotenv').config();

const { validateEnv } = require('./src/config/env');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

// Validate environment before anything else
validateEnv();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Socket.io will attach to this server in a later step
  // const io = require('./src/socket')(server);

  // --- Graceful shutdown ---
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });

    // Force exit if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`, err);
    shutdown('unhandledRejection');
  });
};

startServer();
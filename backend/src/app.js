const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');

const errorHandler = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimiter');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const meetupRoutes = require('./routes/meetup.routes');

const app = express();


// --- Security headers ---
app.use(helmet());

// --- CORS ---
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// --- Body parsing ---
app.use(express.json({ limit: '10kb' })); // Reject suspiciously large bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// --- NoSQL injection sanitization ---
app.use(mongoSanitize());

// --- Compression ---
app.use(compression());
app.use(passport.initialize());

// --- HTTP request logging ---
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // In prod, pipe morgan into winston
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// --- Global rate limiter ---
app.use('/api', limiter);

// --- Health check (no auth, no rate limit) ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// --- API routes (mounted here in later steps) ---
app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/meetups', meetupRoutes);
app.use('/api/v1/meetups', meetupRoutes);


// --- 404 handler (exclude socket.io) ---
app.all('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io')) return next();
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// --- Global error handler (must be last) ---
app.use(errorHandler);




module.exports = app;
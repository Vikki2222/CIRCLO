const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/protect');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// --- Local auth ---
router.post('/register', authLimiter, authController.register);
router.post('/login',    authLimiter, authController.login);

// --- Google OAuth ---
// Step 1: Redirect user to Google's consent screen
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Step 2: Google redirects back here after user consents
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  authController.googleCallback
);

// --- Protected ---
router.get('/me', protect, authController.getMe);

module.exports = router;
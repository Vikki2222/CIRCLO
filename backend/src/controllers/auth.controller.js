const authService = require('../services/auth.service');
const { createSendToken, signToken } = require('../utils/jwt');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/auth/register
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;
  const user = await authService.registerUser({ name, email, password });
  createSendToken(user, 201, res);
});

/**
 * POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await authService.loginUser({ email, password });
  createSendToken(user, 200, res);
});

/**
 * GET /api/v1/auth/google/callback
 * Passport has already authenticated the user at this point.
 * We just issue a JWT and redirect to frontend with it.
 */
const googleCallback = catchAsync(async (req, res, next) => {
  const token = signToken(req.user._id);

  // Redirect frontend — it reads the token from the URL hash
  // Use httpOnly cookie in production instead for XSS protection
  res.redirect(`${process.env.CLIENT_URL}/auth/callback#token=${token}`);
});

/**
 * GET /api/v1/auth/me
 */
const getMe = catchAsync(async (req, res, next) => {
  const user = await authService.getUserById(req.user.id);
  res.status(200).json({ status: 'success', data: { user } });
});

module.exports = { register, login, googleCallback, getMe };
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Register a new local user.
 */
const registerUser = async ({ name, email, password }) => {
  // Check duplicate email explicitly for a clean error message
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    authProvider: 'local',
  });

  return user;
};

/**
 * Validate credentials and return the user.
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400);
  }

  // Explicitly select password since it's excluded by default
  const user = await User.findOne({ email }).select('+password +isActive');

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (user.authProvider !== 'local' || !user.password) {
    throw new AppError(
      'This account uses Google Sign-In. Please log in with Google.',
      401
    );
  }

  const isMatch = await user.correctPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  return user;
};

/**
 * Get user profile by ID.
 */
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

module.exports = { registerUser, loginUser, getUserById };
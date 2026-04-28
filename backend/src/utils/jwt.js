const jwt = require('jsonwebtoken');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

/**
 * Signs a token and sends it in the response.
 * Keeps auth response shape consistent across register/login/OAuth.
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Strip sensitive fields
  user.password = undefined;
  user.isActive = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

module.exports = { signToken, verifyToken, createSendToken };
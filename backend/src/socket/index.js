const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const chatService = require('../services/chat.service');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required.'));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('name avatar');

      if (!user) return next(new Error('User not found.'));

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.user.name} (${socket.id})`);

    socket.on('meetup:join_room', (meetupId) => {
      if (!meetupId) return;
      socket.join(`meetup:${meetupId}`);
      socket.emit('meetup:joined_room', { meetupId });
    });

    socket.on('meetup:leave_room', (meetupId) => {
      if (!meetupId) return;
      socket.leave(`meetup:${meetupId}`);
    });

    socket.on('chat:message', async ({ meetupId, text }) => {
      try {
        if (!meetupId || !text?.trim()) return;

        const rooms = Array.from(socket.rooms);
        if (!rooms.includes(`meetup:${meetupId}`)) {
          socket.emit('chat:error', { message: 'Join the meetup room first.' });
          return;
        }

        const message = await chatService.saveMessage({
          meetupId,
          senderId: socket.user._id,
          text,
        });

        io.to(`meetup:${meetupId}`).emit('chat:message', {
          _id:       message._id,
          text:      message.text,
          sender:    message.sender,
          meetupId,
          createdAt: message.createdAt,
        });

      } catch (err) {
        logger.error(`Chat error: ${err.message}`);
        socket.emit('chat:error', { message: 'Failed to send message.' });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.user.name} — ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error [${socket.user.name}]: ${err.message}`);
    });
  });

  return io;
};

module.exports = initSocket;
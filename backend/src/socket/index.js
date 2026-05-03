const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const chatService = require('../services/chat.service');

/**
 * Attaches Socket.io to the HTTP server.
 * Returns the io instance so services can emit events.
 */
const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping timeout/interval — detect dead connections faster
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // ── Auth middleware ─────────────────────────────────────────
  // Every socket connection must provide a valid JWT.
  // Unauthenticated connections are rejected before any event fires.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required.'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('name avatar');

      if (!user) return next(new Error('User not found.'));

      // Attach user to socket for use in event handlers
      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection handler ──────────────────────────────────────
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.user.name} (${socket.id})`);

    // ── Meetup room events ────────────────────────────────────

    /**
     * Client joins a meetup room to receive real-time updates.
     * Emit: meetup:joined_room
     */
    socket.on('meetup:join_room', (meetupId) => {
      if (!meetupId) return;

      socket.join(`meetup:${meetupId}`);
      logger.debug(`${socket.user.name} joined room meetup:${meetupId}`);

      socket.emit('meetup:joined_room', { meetupId });
    });

    /**
     * Client leaves a meetup room.
     */
    socket.on('meetup:leave_room', (meetupId) => {
      if (!meetupId) return;
      socket.leave(`meetup:${meetupId}`);
      logger.debug(`${socket.user.name} left room meetup:${meetupId}`);
    });

    /**
     * Client sends a chat message.
     * We save it, then broadcast to the meetup room.
     */
    socket.on('chat:message', async ({ meetupId, text }) => {
      try {
        if (!meetupId || !text?.trim()) return;

        // Only attendees can chat — check room membership
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

        // Broadcast to everyone in the room (including sender)
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

    // ── Chat events ───────────────────────────────────────────
    // Handled in socket/chat.handler.js (Step 7)

    // ── Disconnect ────────────────────────────────────────────
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
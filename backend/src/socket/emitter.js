/**
 * Centralized socket emitter.
 *
 * Services import this to emit events WITHOUT needing
 * direct access to the io instance. Keeps services clean.
 *
 * Usage in any service:
 *   const emitter = require('../socket/emitter');
 *   emitter.meetupUpdated(io, meetupId, payload);
 */

const meetupAttendeeUpdate = (io, meetupId, payload) => {
    io.to(`meetup:${meetupId}`).emit('meetup:attendee_update', {
      meetupId,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  };
  
  const meetupFull = (io, meetupId, payload) => {
    // Broadcast to ALL connected clients — map pins need to update globally
    io.emit('meetup:full', {
      meetupId,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  };
  
  const meetupReopened = (io, meetupId, payload) => {
    // Broadcast to ALL — a spot opened up, map pin goes back to active
    io.emit('meetup:reopened', {
      meetupId,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  };
  
  const meetupCancelled = (io, meetupId) => {
    io.emit('meetup:cancelled', {
      meetupId,
      timestamp: new Date().toISOString(),
    });
  };
  
  module.exports = {
    meetupAttendeeUpdate,
    meetupFull,
    meetupReopened,
    meetupCancelled,
  };
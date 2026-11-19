/**
 * Centralized socket emitter.
 *
 * Controllers get the io instance via req.app.get('io') and call these
 * helpers. Every helper is a no-op when io is not attached (e.g. in tests).
 */

const roomFor = (meetupId) => `meetup:${meetupId}`;
const chatRoomFor = (meetupId) => `chat:${meetupId}`;

const snapshot = (meetup) => ({
  meetupId: meetup._id.toString(),
  status: meetup.status,
  attendeeCount: meetup.attendeeCount,
  spotsLeft: meetup.spotsLeft,
  timestamp: new Date().toISOString(),
});

/**
 * Attendee list changed (join / leave / kick).
 * - Room members get the detailed update.
 * - Everyone gets full / reopened so map pins change colour.
 */
const meetupAttendeesChanged = (io, meetup) => {
  if (!io) return;
  const payload = snapshot(meetup);
  io.to(roomFor(payload.meetupId)).emit('meetup:attendee_update', payload);
  if (meetup.status === 'full') io.emit('meetup:full', payload);
  else if (meetup.status === 'active') io.emit('meetup:reopened', payload);
};

const meetupCancelled = (io, meetupId) => {
  if (!io) return;
  io.emit('meetup:cancelled', {
    meetupId: meetupId.toString(),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Remove a user's sockets from a meetup's chat room
 * (after they leave or are kicked) so they stop receiving messages.
 */
const removeFromChat = async (io, meetupId, userId) => {
  if (!io) return;
  const sockets = await io.in(chatRoomFor(meetupId)).fetchSockets();
  sockets
    .filter((s) => s.data.userId === userId.toString())
    .forEach((s) => s.leave(chatRoomFor(meetupId)));
};

module.exports = {
  roomFor,
  chatRoomFor,
  meetupAttendeesChanged,
  meetupCancelled,
  removeFromChat,
};

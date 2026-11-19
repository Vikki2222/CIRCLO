const Message = require('../models/Message');
const Meetup  = require('../models/Meetup');
const AppError = require('../utils/AppError');

/**
 * True if the user is in the meetup's attendees (the host always is).
 */
const isAttendee = async (meetupId, userId) =>
  !!(await Meetup.exists({ _id: meetupId, attendees: userId }));

/**
 * Fetch last N messages for a meetup. Attendees only.
 */
const getMessages = async (meetupId, userId, limit = 50) => {
  const meetup = await Meetup.findById(meetupId);
  if (!meetup) throw new AppError('Meetup not found.', 404);

  if (!(await isAttendee(meetupId, userId))) {
    throw new AppError('Only attendees can view this chat.', 403);
  }

  const messages = await Message.find({ meetup: meetupId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('sender', 'name avatar');

  return messages;
};

/**
 * Save a new message.
 */
const saveMessage = async ({ meetupId, senderId, text }) => {
  const message = await Message.create({
    meetup: meetupId,
    sender: senderId,
    text:   text.trim(),
  });

  // Populate sender for the socket emit
  await message.populate('sender', 'name avatar');
  return message;
};

module.exports = { isAttendee, getMessages, saveMessage };
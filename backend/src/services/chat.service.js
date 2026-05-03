const Message = require('../models/Message');
const Meetup  = require('../models/Meetup');
const AppError = require('../utils/AppError');

/**
 * Fetch last N messages for a meetup.
 */
const getMessages = async (meetupId, limit = 50) => {
  const meetup = await Meetup.findById(meetupId);
  if (!meetup) throw new AppError('Meetup not found.', 404);

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

module.exports = { getMessages, saveMessage };
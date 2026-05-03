const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    meetup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meetup',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index — fetch messages for a meetup sorted by time
messageSchema.index({ meetup: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
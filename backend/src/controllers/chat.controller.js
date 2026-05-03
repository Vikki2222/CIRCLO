const chatService = require('../services/chat.service');
const catchAsync  = require('../utils/catchAsync');

/**
 * GET /api/v1/meetups/:id/messages
 */
const getMessages = catchAsync(async (req, res) => {
  const messages = await chatService.getMessages(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { messages },
  });
});

module.exports = { getMessages };
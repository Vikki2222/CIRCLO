const joinService = require('../services/join.service');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/meetups/:id/join
 */
const join = catchAsync(async (req, res) => {
  const meetup = await joinService.joinMeetup(req.params.id, req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Successfully joined the meetup.',
    data: {
      meetup: {
        _id: meetup._id,
        status: meetup.status,
        attendeeCount: meetup.attendeeCount,
        spotsLeft: meetup.spotsLeft,
        isFull: meetup.isFull,
      },
    },
  });
});

/**
 * POST /api/v1/meetups/:id/leave
 */
const leave = catchAsync(async (req, res) => {
  const meetup = await joinService.leaveMeetup(req.params.id, req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Successfully left the meetup.',
    data: {
      meetup: {
        _id: meetup._id,
        status: meetup.status,
        attendeeCount: meetup.attendeeCount,
        spotsLeft: meetup.spotsLeft,
        isFull: meetup.isFull,
      },
    },
  });
});

/**
 * DELETE /api/v1/meetups/:id/attendees/:userId
 */
const kick = catchAsync(async (req, res) => {
  const meetup = await joinService.kickAttendee(
    req.params.id,
    req.user.id,
    req.params.userId
  );

  res.status(200).json({
    status: 'success',
    message: 'Attendee removed.',
    data: {
      meetup: {
        _id: meetup._id,
        status: meetup.status,
        attendeeCount: meetup.attendeeCount,
        spotsLeft: meetup.spotsLeft,
      },
    },
  });
});

module.exports = { join, leave, kick };
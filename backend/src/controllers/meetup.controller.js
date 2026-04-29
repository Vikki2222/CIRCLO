const meetupService = require('../services/meetup.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * POST /api/v1/meetups
 * Body: { title, description, category, coordinates: [lng, lat],
 *         address, capacity, startsAt, endsAt?, tags?, coverImage? }
 */
const createMeetup = catchAsync(async (req, res) => {
  const meetup = await meetupService.createMeetup(req.user.id, req.body);

  res.status(201).json({
    status: 'success',
    data: { meetup },
  });
});

/**
 * GET /api/v1/meetups/nearby?lng=&lat=&radius=&category=&page=&limit=
 */
const getNearbyMeetups = catchAsync(async (req, res) => {
  const { lng, lat, radius, category, page, limit } = req.query;

  if (!lng || !lat) {
    throw new AppError('Please provide lng and lat query parameters.', 400);
  }

  const result = await meetupService.findNearbyMeetups({
    lng,
    lat,
    radiusKm: radius ? parseFloat(radius) : 10,
    category,
    page,
    limit,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * GET /api/v1/meetups/my
 */
const getMyMeetups = catchAsync(async (req, res) => {
  const result = await meetupService.getHostMeetups(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * GET /api/v1/meetups/joined
 */
const getJoinedMeetups = catchAsync(async (req, res) => {
  const result = await meetupService.getJoinedMeetups(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * GET /api/v1/meetups/:id
 */
const getMeetup = catchAsync(async (req, res) => {
  const meetup = await meetupService.getMeetupById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { meetup },
  });
});

/**
 * PATCH /api/v1/meetups/:id
 */
const updateMeetup = catchAsync(async (req, res) => {
  const meetup = await meetupService.updateMeetup(
    req.params.id,
    req.user.id,
    req.body
  );

  res.status(200).json({
    status: 'success',
    data: { meetup },
  });
});

/**
 * DELETE /api/v1/meetups/:id
 */
const deleteMeetup = catchAsync(async (req, res) => {
  await meetupService.deleteMeetup(req.params.id, req.user.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  createMeetup,
  getNearbyMeetups,
  getMyMeetups,
  getJoinedMeetups,
  getMeetup,
  updateMeetup,
  deleteMeetup,
};
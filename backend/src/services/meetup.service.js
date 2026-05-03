const Meetup = require('../models/Meetup');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

const createMeetup = async (hostId, body) => {
  const { title, description, category, coordinates, address, capacity, startsAt, endsAt, tags, coverImage } = body;

  const meetup = await Meetup.create({
    title,
    description,
    category,
    host: hostId,
    location: {
      type: 'Point',
      coordinates,
      address,
    },
    capacity,
    startsAt,
    endsAt,
    tags,
    coverImage,
    attendees: [hostId],
  });

  return meetup;
};

// ─────────────────────────────────────────────
// FIND NEARBY
// ─────────────────────────────────────────────

const findNearbyMeetups = async ({ lng, lat, radiusKm = 10, category, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const filter = {
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radiusKm * 1000,
      },
    },
    status: { $in: ['active', 'full'] },
    startsAt: { $gte: new Date() },
  };

  if (category) filter.category = category;

  const [rawMeetups, total] = await Promise.all([
    Meetup.find(filter)
      .populate('host', 'name avatar')
      .select('-isDeleted -__v')
      .skip(skip)
      .limit(limit)
      .lean(), // ← plain JS objects, fast, no virtuals but attendees array is present

    Meetup.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            radiusKm / 6378.1,
          ],
        },
      },
      status: { $in: ['active', 'full'] },
      startsAt: { $gte: new Date() },
      ...(category && { category }),
    }),
  ]);

  // Manually compute counts since lean() skips virtuals
  const meetups = rawMeetups.map((m) => ({
    ...m,
    attendeeCount: m.attendees?.length ?? 0,
    spotsLeft:     m.capacity - (m.attendees?.length ?? 0),
    isFull:        (m.attendees?.length ?? 0) >= m.capacity,
  }));

  return {
    meetups,
    pagination: {
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  };
};

// ─────────────────────────────────────────────
// GET ONE
// ─────────────────────────────────────────────

const getMeetupById = async (meetupId) => {
  const meetup = await Meetup.findById(meetupId)
    .populate('host', 'name avatar')
    .populate('attendees', 'name avatar');

  if (!meetup) throw new AppError('Meetup not found.', 404);
  return meetup;
};

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

const UPDATABLE_FIELDS = [
  'title', 'description', 'category',
  'capacity', 'startsAt', 'endsAt',
  'tags', 'coverImage', 'location',
];

const updateMeetup = async (meetupId, userId, body) => {
  const meetup = await Meetup.findById(meetupId);
  if (!meetup) throw new AppError('Meetup not found.', 404);

  if (meetup.host.toString() !== userId.toString()) {
    throw new AppError('Only the host can update this meetup.', 403);
  }

  if (meetup.status === 'cancelled') {
    throw new AppError('Cannot update a cancelled meetup.', 400);
  }

  UPDATABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) meetup[field] = body[field];
  });

  if (body.capacity !== undefined && body.capacity < meetup.attendees.length) {
    throw new AppError(
      `Cannot reduce capacity below current attendee count (${meetup.attendees.length}).`,
      400
    );
  }

  await meetup.save();
  return meetup;
};

// ─────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────

const deleteMeetup = async (meetupId, userId) => {
  const meetup = await Meetup.findById(meetupId);
  if (!meetup) throw new AppError('Meetup not found.', 404);

  if (meetup.host.toString() !== userId.toString()) {
    throw new AppError('Only the host can delete this meetup.', 403);
  }

  meetup.isDeleted = true;
  meetup.status = 'cancelled';
  await meetup.save({ validateBeforeSave: false });
};

// ─────────────────────────────────────────────
// MY MEETUPS
// ─────────────────────────────────────────────

const getHostMeetups = async (userId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [rawMeetups, total] = await Promise.all([
    Meetup.find({ host: userId })
      .sort({ startsAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-isDeleted -__v')
      .lean(),

    Meetup.countDocuments({ host: userId }),
  ]);

  const meetups = rawMeetups.map((m) => ({
    ...m,
    attendeeCount: m.attendees?.length ?? 0,
    spotsLeft:     m.capacity - (m.attendees?.length ?? 0),
    isFull:        (m.attendees?.length ?? 0) >= m.capacity,
  }));

  return {
    meetups,
    pagination: {
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  };
};

// ─────────────────────────────────────────────
// JOINED MEETUPS
// ─────────────────────────────────────────────

const getJoinedMeetups = async (userId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [rawMeetups, total] = await Promise.all([
    Meetup.find({
      attendees: userId,
      host: { $ne: userId },
    })
      .sort({ startsAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'name avatar')
      .select('-isDeleted -__v')
      .lean(),

    Meetup.countDocuments({
      attendees: userId,
      host: { $ne: userId },
    }),
  ]);

  const meetups = rawMeetups.map((m) => ({
    ...m,
    attendeeCount: m.attendees?.length ?? 0,
    spotsLeft:     m.capacity - (m.attendees?.length ?? 0),
    isFull:        (m.attendees?.length ?? 0) >= m.capacity,
  }));

  return {
    meetups,
    pagination: {
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  };
};

module.exports = {
  createMeetup,
  findNearbyMeetups,
  getMeetupById,
  updateMeetup,
  deleteMeetup,
  getHostMeetups,
  getJoinedMeetups,
};
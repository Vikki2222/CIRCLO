const Meetup = require('../models/Meetup');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

const createMeetup = async (hostId, body) => {
  const { title, description, category, coordinates, address, capacity, startsAt, endsAt, tags, coverImage } = body;

  // coordinates arrives as [lng, lat] from the client
  const meetup = await Meetup.create({
    title,
    description,
    category,
    host: hostId,
    location: {
      type: 'Point',
      coordinates, // [longitude, latitude]
      address,
    },
    capacity,
    startsAt,
    endsAt,
    tags,
    coverImage,
    // Host auto-joins their own meetup
    attendees: [hostId],
  });

  return meetup;
};

// ─────────────────────────────────────────────
// FIND NEARBY
// ─────────────────────────────────────────────

/**
 * Returns meetups near [lng, lat] within radiusKm.
 * Supports pagination and category filter.
 */
const findNearbyMeetups = async ({ lng, lat, radiusKm = 10, category, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const filter = {
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radiusKm * 1000, // km → meters
      },
    },
    status: { $in: ['active', 'full'] },
    startsAt: { $gte: new Date() },
  };

  if (category) filter.category = category;

  // $near doesn't support .countDocuments() — get total separately
  // We use $geoWithin for the count (no sorting, just counting)
  const [meetups, total] = await Promise.all([
    Meetup.find(filter)
      .populate('host', 'name avatar')
      .select('-attendees -isDeleted -__v')
      .skip(skip)
      .limit(limit),

    Meetup.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            radiusKm / 6378.1, // Convert km → radians (Earth radius = 6378.1 km)
          ],
        },
      },
      status: { $in: ['active', 'full'] },
      startsAt: { $gte: new Date() },
      ...(category && { category }),
    }),
  ]);

  return {
    meetups,
    pagination: {
      total,
      page: parseInt(page),
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
  'tags', 'coverImage',
  'location', // allow address update but not used to move meetup arbitrarily
];

const updateMeetup = async (meetupId, userId, body) => {
  const meetup = await Meetup.findById(meetupId);
  if (!meetup) throw new AppError('Meetup not found.', 404);

  // Only the host can update
  if (meetup.host.toString() !== userId.toString()) {
    throw new AppError('Only the host can update this meetup.', 403);
  }

  if (meetup.status === 'cancelled') {
    throw new AppError('Cannot update a cancelled meetup.', 400);
  }

  // Whitelist updatable fields — prevent patching host, attendees, status directly
  UPDATABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      meetup[field] = body[field];
    }
  });

  // If capacity is reduced, ensure it's not below current attendee count
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

  // Soft delete + cancel so attendees know it's gone
  meetup.isDeleted = true;
  meetup.status = 'cancelled';
  await meetup.save({ validateBeforeSave: false });
};

// ─────────────────────────────────────────────
// MY MEETUPS
// ─────────────────────────────────────────────

const getHostMeetups = async (userId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [meetups, total] = await Promise.all([
    Meetup.find({ host: userId })
      .sort({ startsAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-attendees -__v'),

    Meetup.countDocuments({ host: userId }),
  ]);

  return {
    meetups,
    pagination: {
      total,
      page: parseInt(page),
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

  const [meetups, total] = await Promise.all([
    Meetup.find({
      attendees: userId,
      host: { $ne: userId }, // Exclude ones they host (use /my for that)
    })
      .sort({ startsAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'name avatar')
      .select('-attendees -__v'),

    Meetup.countDocuments({
      attendees: userId,
      host: { $ne: userId },
    }),
  ]);

  return {
    meetups,
    pagination: {
      total,
      page: parseInt(page),
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
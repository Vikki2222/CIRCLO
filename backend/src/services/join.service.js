const mongoose = require('mongoose');
const Meetup = require('../models/Meetup');
const AppError = require('../utils/AppError');
const emitter = require('../socket/emitter');

/**
 * Atomically join a meetup.
 *
 * The entire "is there space?" check + "add attendee" write happens
 * in ONE MongoDB operation. This is the only safe way to do this.
 *
 * Returns the updated meetup, or throws a descriptive AppError.
 */
const joinMeetup = async (meetupId, userId) => {
  // Pre-flight: check meetup exists and user isn't already in it
  // (cheap read before the atomic write)
  const meetup = await Meetup.findById(meetupId);

  if (!meetup) throw new AppError('Meetup not found.', 404);

  if (meetup.status === 'cancelled') {
    throw new AppError('This meetup has been cancelled.', 400);
  }

  if (meetup.status === 'ended') {
    throw new AppError('This meetup has already ended.', 400);
  }

  if (meetup.startsAt < new Date()) {
    throw new AppError('This meetup has already started.', 400);
  }

  const alreadyJoined = meetup.attendees.some(
    (id) => id.toString() === userId.toString()
  );
  if (alreadyJoined) {
    throw new AppError('You have already joined this meetup.', 409);
  }

  // ── Atomic join ──────────────────────────────────────────────
  // Conditions (all must be true for the update to execute):
  //   1. meetupId matches
  //   2. status is 'active' (not full, not cancelled)
  //   3. attendees.length < capacity  ← the race condition guard
  //   4. user is not already in attendees
  //
  // If any condition fails, findOneAndUpdate returns null → we throw.
  // ────────────────────────────────────────────────────────────
  const updatedMeetup = await Meetup.findOneAndUpdate(
    {
      _id: meetupId,
      status: 'active',
      $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] },
      attendees: { $ne: new mongoose.Types.ObjectId(userId) },
    },
    {
      $push: { attendees: userId },
    },
    {
      new: true, // Return the updated document
      runValidators: false, // Skip schema validation (not needed for $push)
    }
  ).populate('host', 'name avatar');

  if (!updatedMeetup) {
    // The atomic update failed — figure out why for a clean error message
    const current = await Meetup.findById(meetupId);

    if (!current) throw new AppError('Meetup not found.', 404);
    if (current.status === 'full') throw new AppError('This meetup is full.', 409);
    if (current.status !== 'active') throw new AppError('This meetup is no longer active.', 400);

    // Fallback (shouldn't normally reach here)
    throw new AppError('Unable to join meetup. Please try again.', 409);
  }

  // Auto-update status if now full (pre-save hook won't run on findOneAndUpdate)
  // We handle this manually here
  if (updatedMeetup.attendees.length >= updatedMeetup.capacity) {
    updatedMeetup.status = 'full';
    await Meetup.findByIdAndUpdate(meetupId, { status: 'full' });
  }

  return updatedMeetup;
};

/**
 * Atomically leave a meetup.
 *
 * Hosts cannot leave their own meetup — they must delete it instead.
 */
const leaveMeetup = async (meetupId, userId) => {
  const meetup = await Meetup.findById(meetupId);

  if (!meetup) throw new AppError('Meetup not found.', 404);

  if (meetup.host.toString() === userId.toString()) {
    throw new AppError(
      'Hosts cannot leave their own meetup. Delete the meetup instead.',
      400
    );
  }

  if (meetup.status === 'cancelled') {
    throw new AppError('This meetup has been cancelled.', 400);
  }

  const isAttendee = meetup.attendees.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isAttendee) {
    throw new AppError('You are not a member of this meetup.', 409);
  }

  // ── Atomic leave ─────────────────────────────────────────────
  // $pull removes the userId from attendees array atomically.
  // ────────────────────────────────────────────────────────────
  const updatedMeetup = await Meetup.findOneAndUpdate(
    {
      _id: meetupId,
      attendees: new mongoose.Types.ObjectId(userId),
    },
    {
      $pull: { attendees: new mongoose.Types.ObjectId(userId) },
    },
    { new: true }
  ).populate('host', 'name avatar');

  if (!updatedMeetup) {
    throw new AppError('Unable to leave meetup. Please try again.', 409);
  }

  // If meetup was full, reopen it now there's a spot
  if (
    updatedMeetup.status === 'full' &&
    updatedMeetup.attendees.length < updatedMeetup.capacity
  ) {
    updatedMeetup.status = 'active';
    await Meetup.findByIdAndUpdate(meetupId, { status: 'active' });
  }

  return updatedMeetup;
};

/**
 * Kick an attendee (host only).
 */
const kickAttendee = async (meetupId, hostId, targetUserId) => {
  const meetup = await Meetup.findById(meetupId);

  if (!meetup) throw new AppError('Meetup not found.', 404);

  if (meetup.host.toString() !== hostId.toString()) {
    throw new AppError('Only the host can remove attendees.', 403);
  }

  if (meetup.host.toString() === targetUserId.toString()) {
    throw new AppError('Cannot kick the host.', 400);
  }

  const isAttendee = meetup.attendees.some(
    (id) => id.toString() === targetUserId.toString()
  );
  if (!isAttendee) {
    throw new AppError('This user is not in the meetup.', 404);
  }

  const updatedMeetup = await Meetup.findOneAndUpdate(
    { _id: meetupId },
    { $pull: { attendees: new mongoose.Types.ObjectId(targetUserId) } },
    { new: true }
  ).populate('host', 'name avatar');

  // Reopen if was full
  if (
    updatedMeetup.status === 'full' &&
    updatedMeetup.attendees.length < updatedMeetup.capacity
  ) {
    updatedMeetup.status = 'active';
    await Meetup.findByIdAndUpdate(meetupId, { status: 'active' });
  }

  return updatedMeetup;
};

module.exports = { joinMeetup, leaveMeetup, kickAttendee };
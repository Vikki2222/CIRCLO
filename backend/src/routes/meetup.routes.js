const express = require('express');
const meetupController = require('../controllers/meetup.controller');
const joinController   = require('../controllers/join.controller');
const chatController   = require('../controllers/chat.controller');
const { protect }      = require('../middleware/protect');

const router = express.Router();

// ── Public ───────────────────────────────────────────────────
router.get('/nearby', meetupController.getNearbyMeetups);

// ── Protected ────────────────────────────────────────────────
router.use(protect);

router.post('/',              meetupController.createMeetup);
router.get('/my',             meetupController.getMyMeetups);
router.get('/joined',         meetupController.getJoinedMeetups);

// ── These must come BEFORE /:id ──────────────────────────────
router.get('/:id/messages',   chatController.getMessages);
router.post('/:id/join',      joinController.join);
router.post('/:id/leave',     joinController.leave);
router.delete('/:id/attendees/:userId', joinController.kick);

// ── Generic /:id last ────────────────────────────────────────
router.get('/:id',            meetupController.getMeetup);
router.patch('/:id',          meetupController.updateMeetup);
router.delete('/:id',         meetupController.deleteMeetup);

module.exports = router;
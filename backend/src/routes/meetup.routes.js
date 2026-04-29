const express = require('express');
const joinController = require('../controllers/join.controller');
const meetupController = require('../controllers/meetup.controller');
const { protect } = require('../middleware/protect');

const router = express.Router();

// Public routes
router.get('/nearby', meetupController.getNearbyMeetups);

// Protected routes
router.use(protect); // All routes below require auth

router.post('/:id/join',                       joinController.join);
router.post('/:id/leave',                      joinController.leave);
router.delete('/:id/attendees/:userId',        joinController.kick);

router.post('/',         meetupController.createMeetup);
router.get('/my',        meetupController.getMyMeetups);      // ← must be before /:id
router.get('/joined',    meetupController.getJoinedMeetups);  // ← must be before /:id

router.get('/:id',    meetupController.getMeetup);
router.patch('/:id',     meetupController.updateMeetup);
router.delete('/:id',    meetupController.deleteMeetup);

module.exports = router;
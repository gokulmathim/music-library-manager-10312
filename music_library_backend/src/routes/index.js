const express = require('express');
const healthController = require('../controllers/health');
const userController = require('../controllers/user');
const { MusicController, uploadMiddleware } = require('../controllers/music');
const playlistController = require('../controllers/playlist');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Health endpoint (public)
router.get('/', healthController.check.bind(healthController));

// User auth endpoints (public)
router.post('/users/register', userController.register.bind(userController));
router.post('/users/login', userController.login.bind(userController));

// Only authenticated endpoints below
router.get('/users/me', requireAuth, userController.getProfile.bind(userController));
router.patch('/users/me', requireAuth, userController.updateProfile.bind(userController));
router.patch('/users/me/password', requireAuth, userController.changePassword.bind(userController));

// Music tracks
router.post('/music/upload', requireAuth, uploadMiddleware(), MusicController.uploadTrack.bind(MusicController));
router.get('/music', requireAuth, MusicController.listTracks.bind(MusicController));
router.get('/music/:id', requireAuth, MusicController.getTrackById.bind(MusicController));
router.get('/music/:id/stream', requireAuth, MusicController.streamTrack.bind(MusicController));

// Playlists
router.post('/playlists', requireAuth, playlistController.create.bind(playlistController));
router.get('/playlists', requireAuth, playlistController.list.bind(playlistController));
router.get('/playlists/:id', requireAuth, playlistController.get.bind(playlistController));
router.post('/playlists/:id/tracks', requireAuth, playlistController.addTrack.bind(playlistController));
router.delete('/playlists/:id/tracks/:track_id', requireAuth, playlistController.removeTrack.bind(playlistController));
router.delete('/playlists/:id', requireAuth, playlistController.delete.bind(playlistController));

module.exports = router;

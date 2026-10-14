const express = require('express');
const router = express.Router();
const { signup, login, logout, me } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me); // protected: must be logged in

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication Routes
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/signup', (req, res, next) => authController.register(req, res, next));
router.get('/me', (req, res, next) => authController.getMe(req, res, next));
router.get('/roles', (req, res, next) => authController.getRoles(req, res, next));

module.exports = router;

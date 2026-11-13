const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User Management Routes
router.get('/', (req, res, next) => userController.getAll(req, res, next));
router.post('/', (req, res, next) => userController.create(req, res, next));
router.patch('/:id/role', (req, res, next) => userController.updateRole(req, res, next));
router.patch('/:id/active', (req, res, next) => userController.toggleActive(req, res, next));

module.exports = router;

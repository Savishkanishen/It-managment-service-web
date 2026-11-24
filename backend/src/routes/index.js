const express = require('express');
const router = express.Router();

// 1. Import Feature Routes
const authRoutes = require('./auth');
const userRoutes = require('./users');
const divisionRoutes = require('./divisions');
const ticketRoutes = require('./tickets');
const assetRoutes = require('./assets');
const stockRoutes = require('./stock-items');
const repairRoutes = require('./repairs');
const vendorRoutes = require('./vendors');
const publicationRoutes = require('./publications');
const zoomRoutes = require('./zoom-requests');
const taskRoutes = require('./tasks');
const auditLogRoutes = require('./audit-logs');
const eventRoutes = require('./events');

// 2. Mount Endpoints
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/divisions', divisionRoutes);
router.use('/tickets', ticketRoutes);
router.use('/assets', assetRoutes);
router.use('/stock-items', stockRoutes);
router.use('/repairs', repairRoutes);
router.use('/vendors', vendorRoutes);
router.use('/publications', publicationRoutes);
router.use('/zoom-requests', zoomRoutes);
router.use('/tasks', taskRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/events', eventRoutes);

module.exports = router;


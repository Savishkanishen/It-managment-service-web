const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Mount All API Routes
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/api/health', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT current_database(), current_schema(), NOW() as server_time;'
    );
    res.json({ status: 'UP', database: rows[0] });
  } catch (err) {
    next(err);
  }
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 ITSM Backend server listening on port ${PORT}`);
  await db.testConnection();
});

module.exports = app;

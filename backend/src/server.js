const express = require('express');
const cors = require('cors');
const db = require('./config/db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Import All Routes
const divisionRoutes = require('./routes/divisions');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const assetRoutes = require('./routes/assets');
const stockRoutes = require('./routes/stock-items');
const repairRoutes = require('./routes/repairs');
const vendorRoutes = require('./routes/vendors');
const publicationRoutes = require('./routes/publications');
const zoomRoutes = require('./routes/zoom-requests');
const taskRoutes = require('./routes/tasks');
const auditLogRoutes = require('./routes/audit-logs');
const authRoutes = require('./routes/auth'); 

// 2. Register All Routes
app.use('/api/divisions', divisionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/stock-items', stockRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/zoom-requests', zoomRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/auth', authRoutes);

// 3. Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT current_database(), current_schema(), NOW() as server_time;'
    );
    res.json({ status: 'UP', database: rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
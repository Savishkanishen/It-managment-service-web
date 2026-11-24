const express = require('express');
const router = express.Router();
const { addClient, removeClient } = require('../utils/realtime');

/**
 * GET /api/events
 * Real-time Server-Sent Events stream for all connected clients
 */
router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Initial connection heartbeat
  res.write('event: connected\ndata: {"status":"connected","timestamp":' + Date.now() + '}\n\n');

  addClient(res);

  // Keep-alive ping every 25 seconds to prevent browser/proxy timeouts
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      clearInterval(keepAliveTimer);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    removeClient(res);
  });
});

module.exports = router;

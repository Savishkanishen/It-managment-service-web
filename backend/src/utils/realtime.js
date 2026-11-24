/**
 * Real-Time Server-Sent Events (SSE) Broadcast Utility
 * Allows the backend to push instant real-time events to all connected clients
 */

let clients = [];

/**
 * Register a new connected client HTTP response stream
 */
function addClient(res) {
  clients.push(res);
}

/**
 * Unregister a disconnected client
 */
function removeClient(res) {
  clients = clients.filter(c => c !== res);
}

/**
 * Broadcast an event to all connected clients
 * @param {string} type - Event name (e.g. 'task_update', 'zoom_update')
 * @param {object} data - Payload object
 */
function broadcastEvent(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(payload);
    } catch (err) {
      // Stream closed or broken
    }
  });
}

module.exports = {
  addClient,
  removeClient,
  broadcastEvent,
};

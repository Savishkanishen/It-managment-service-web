import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import {
  USERS, DIVISIONS, ASSETS, STOCK_ITEMS, TICKETS,
  REPAIRS, VENDORS, ZOOM_REQUESTS, PUBLICATIONS, TASKS, AUDIT_LOGS,
  setDynamicUsers, setDynamicAssets,
  getTicketStats as helperGetTicketStats,
  getTaskStats as helperGetTaskStats,
} from '../data/mockData';

const DataContext = createContext(null);
const API_BASE = 'http://localhost:5000/api';

function mergeRemoteTasks(localTasks, remoteTasks) {
  if (!Array.isArray(remoteTasks) || remoteTasks.length === 0) return localTasks;
  const resultMap = new Map();

  localTasks.forEach(t => {
    if (t.id) resultMap.set(t.id, t);
    if (t.taskNumber) resultMap.set(t.taskNumber, t);
  });

  remoteTasks.forEach(rt => {
    const key = rt.id || rt.taskNumber;
    const local = resultMap.get(rt.id) || (rt.taskNumber ? resultMap.get(rt.taskNumber) : null);
    if (!local) {
      resultMap.set(key, rt);
    } else {
      const localCompleted = local.status === 'Completed' || local.status === 'Cancelled';
      const remoteCompleted = rt.status === 'Completed' || rt.status === 'Cancelled';
      if (localCompleted && !remoteCompleted) {
        resultMap.set(local.id, { ...rt, ...local, status: local.status });
      } else {
        resultMap.set(local.id, { ...local, ...rt });
      }
    }
  });

  return Array.from(new Set(resultMap.values()));
}

function mergeRemoteZoom(localZoom, remoteZoom) {
  let deletedIds = [];
  try {
    deletedIds = JSON.parse(localStorage.getItem('itsm_deleted_zoom_ids') || '[]');
  } catch (e) {}

  if (!Array.isArray(remoteZoom) || remoteZoom.length === 0) {
    return localZoom.filter(z => !deletedIds.includes(z.id));
  }

  const resultMap = new Map();
  localZoom.filter(z => !deletedIds.includes(z.id)).forEach(z => {
    resultMap.set(z.id, z);
    if (z.meetingName) resultMap.set(z.meetingName.toLowerCase(), z);
  });

  remoteZoom.forEach(rz => {
    if (deletedIds.includes(rz.id)) return;
    const local = resultMap.get(rz.id) || (rz.meetingName ? resultMap.get(rz.meetingName.toLowerCase()) : null);
    if (!local) {
      resultMap.set(rz.id, rz);
    } else {
      if (local.status === 'Completed' && rz.status !== 'Completed') {
        resultMap.set(local.id, { ...rz, ...local, status: 'Completed' });
      } else {
        resultMap.set(local.id, { ...local, ...rz });
      }
    }
  });

  return Array.from(new Set(resultMap.values())).filter(z => !deletedIds.includes(z.id));
}

function mergeRemoteTickets(localTickets, remoteTickets) {
  let deletedIds = [];
  try {
    deletedIds = JSON.parse(localStorage.getItem('itsm_deleted_ticket_ids') || '[]');
  } catch (e) {}

  if (!Array.isArray(remoteTickets) || remoteTickets.length === 0) {
    return localTickets.filter(t => !deletedIds.includes(t.id) && !deletedIds.includes(t.ticketNumber));
  }

  const resultMap = new Map();

  localTickets.filter(t => !deletedIds.includes(t.id) && !deletedIds.includes(t.ticketNumber)).forEach(t => {
    if (t.id) resultMap.set(t.id, t);
    if (t.ticketNumber) resultMap.set(t.ticketNumber, t);
  });

  remoteTickets.forEach(rt => {
    if (deletedIds.includes(rt.id) || deletedIds.includes(rt.ticketNumber)) return;
    const key = rt.id || rt.ticketNumber;
    const local = resultMap.get(rt.id) || (rt.ticketNumber ? resultMap.get(rt.ticketNumber) : null);
    if (!local) {
      resultMap.set(key, rt);
    } else {
      const localResolved = local.status === 'Resolved' || local.status === 'Closed';
      const remoteResolved = rt.status === 'Resolved' || rt.status === 'Closed';
      if (localResolved && !remoteResolved) {
        resultMap.set(local.id, { ...rt, ...local, status: local.status });
      } else {
        resultMap.set(local.id, { ...local, ...rt });
      }
    }
  });

  return Array.from(new Set(resultMap.values())).filter(t => !deletedIds.includes(t.id) && !deletedIds.includes(t.ticketNumber));
}

function mergeRemoteRepairs(localRepairs, remoteRepairs) {
  let deletedIds = [];
  try {
    deletedIds = JSON.parse(localStorage.getItem('itsm_deleted_repair_ids') || '[]');
  } catch (e) {}

  if (!Array.isArray(remoteRepairs) || remoteRepairs.length === 0) {
    return localRepairs.filter(r => !deletedIds.includes(r.id) && !deletedIds.includes(r.referenceNumber));
  }

  const resultMap = new Map();

  localRepairs.filter(r => !deletedIds.includes(r.id) && !deletedIds.includes(r.referenceNumber)).forEach(r => {
    if (r.id) resultMap.set(r.id, r);
    if (r.referenceNumber) resultMap.set(r.referenceNumber, r);
  });

  remoteRepairs.forEach(rr => {
    if (deletedIds.includes(rr.id) || deletedIds.includes(rr.referenceNumber)) return;
    const key = rr.id || rr.referenceNumber;
    const local = resultMap.get(rr.id) || (rr.referenceNumber ? resultMap.get(rr.referenceNumber) : null);
    if (!local) {
      resultMap.set(key, rr);
    } else {
      const localClosed = local.status === 'Closed';
      const remoteClosed = rr.status === 'Closed';
      if (localClosed && !remoteClosed) {
        resultMap.set(local.id, { ...rr, ...local, status: 'Closed' });
      } else {
        resultMap.set(local.id, { ...local, ...rr });
      }
    }
  });

  return Array.from(new Set(resultMap.values())).filter(r => !deletedIds.includes(r.id) && !deletedIds.includes(r.referenceNumber));
}

export function DataProvider({ children }) {
  const { notifyWorkAssignment } = useNotifications() || {};
  const [divisions, setDivisions] = useState(DIVISIONS);
  const [assets, setAssets] = useState(ASSETS);
  const [stock, setStock] = useState(STOCK_ITEMS);
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('itsm_tickets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return TICKETS;
  });
  const [repairs, setRepairs] = useState(() => {
    try {
      const saved = localStorage.getItem('itsm_repairs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return REPAIRS;
  });
  const [vendors, setVendors] = useState(VENDORS);
  const [zoomRequests, setZoomRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('itsm_zoom_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ZOOM_REQUESTS;
  });
  const [publications, setPublications] = useState(PUBLICATIONS);
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('itsm_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return TASKS;
  });
  const [auditLogs, setAuditLogs] = useState(AUDIT_LOGS);
  const [users, setUsers] = useState(USERS);
  const [loading, setLoading] = useState(true);

  // Sync users and assets to mockData dynamic cache
  useEffect(() => {
    setDynamicUsers(users);
  }, [users]);

  useEffect(() => {
    setDynamicAssets(assets);
  }, [assets]);

  // Persist tasks, zoomRequests, tickets, and repairs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('itsm_tasks', JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('itsm_zoom_requests', JSON.stringify(zoomRequests));
    } catch (e) {}
  }, [zoomRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('itsm_tickets', JSON.stringify(tickets));
    } catch (e) {}
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem('itsm_repairs', JSON.stringify(repairs));
    } catch (e) {}
  }, [repairs]);

  // Cross-tab storage synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'itsm_tasks' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setTasks(parsed);
        } catch (err) {}
      } else if (e.key === 'itsm_zoom_requests' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setZoomRequests(parsed);
        } catch (err) {}
      } else if (e.key === 'itsm_tickets' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setTickets(parsed);
        } catch (err) {}
      } else if (e.key === 'itsm_repairs' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setRepairs(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initial Data Fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const endpoints = [
      { key: 'divisions', url: '/divisions', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDivisions(data.map(d => typeof d === 'object' ? d.name : d));
        }
      }},
      { key: 'assets', url: '/assets', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAssets(data);
          setDynamicAssets(data);
        }
      }},
      { key: 'stock', url: '/stock-items', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setStock(data);
      }},
      { key: 'tickets', url: '/tickets', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTickets(prev => mergeRemoteTickets(prev, data));
        }
      }},
      { key: 'repairs', url: '/repairs', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRepairs(prev => mergeRemoteRepairs(prev, data));
        }
      }},
      { key: 'vendors', url: '/vendors', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setVendors(data);
      }},
      { key: 'zoomRequests', url: '/zoom-requests', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setZoomRequests(prev => mergeRemoteZoom(prev, data));
        }
      }},
      { key: 'publications', url: '/publications', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setPublications(data);
      }},
      { key: 'tasks', url: '/tasks', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTasks(prev => mergeRemoteTasks(prev, data));
        }
      }},
      { key: 'auditLogs', url: '/audit-logs', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setAuditLogs(data);
      }},
      { key: 'users', url: '/users', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setDynamicUsers(data);
        }
      }},
    ];

    await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        try {
          const res = await fetch(`${API_BASE}${endpoint.url}`);
          if (res.ok) {
            const data = await res.json();
            endpoint.setter(data);
          }
        } catch (error) {
          // Gracefully fallback to seeded state
        }
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- REAL-TIME LIVE SYNC (SSE, Cross-Tab Broadcast, and Polling Fallback) ---
  const syncChannelRef = React.useRef(null);

  useEffect(() => {
    // 1. Cross-Tab / Cross-Window BroadcastChannel for zero-latency local sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('itsm_live_sync');
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'TASK_UPDATED' && payload) {
          setTasks(prev => {
            const match = prev.find(t => t.id === payload.id || t.taskNumber === (payload.taskNumber || payload.id) || (payload.title && t.title?.toLowerCase() === payload.title?.toLowerCase()));
            if (match) {
              return prev.map(t => t.id === match.id ? { ...t, ...payload } : t);
            }
            return [payload, ...prev];
          });
        } else if (type === 'ZOOM_UPDATED' && payload) {
          setZoomRequests(prev => {
            const match = prev.find(z => z.id === payload.id || (payload.meetingName && z.meetingName?.toLowerCase() === payload.meetingName?.toLowerCase()));
            if (match) {
              return prev.map(z => z.id === match.id ? { ...z, ...payload } : z);
            }
            return [payload, ...prev];
          });
        } else if (type === 'ZOOM_DELETED' && payload) {
          setZoomRequests(prev => prev.filter(z => z.id !== payload.id && z.id !== payload.mappedId));
        } else if (type === 'TICKET_UPDATED' && payload) {
          setTickets(prev => {
            const match = prev.find(t => t.id === payload.id || t.ticketNumber === (payload.ticketNumber || payload.id));
            if (match) {
              return prev.map(t => (t.id === match.id) ? { ...t, ...payload } : t);
            }
            return [payload, ...prev];
          });
        } else if (type === 'TICKET_DELETED' && payload) {
          setTickets(prev => prev.filter(t => t.id !== payload.id && t.ticketNumber !== payload.id && t.id !== payload.mappedId));
        } else if (type === 'REPAIR_UPDATED' && payload) {
          setRepairs(prev => {
            const match = prev.find(r => r.id === payload.id || r.referenceNumber === (payload.referenceNumber || payload.id));
            if (match) {
              return prev.map(r => (r.id === match.id || r.referenceNumber === match.referenceNumber) ? { ...r, ...payload } : r);
            }
            return [payload, ...prev];
          });
        } else if (type === 'REPAIR_DELETED' && payload) {
          setRepairs(prev => prev.filter(r => r.id !== payload.id && r.referenceNumber !== payload.id && r.id !== payload.mappedId));
        }
      };

      return () => {
        channel.close();
        syncChannelRef.current = null;
      };
    }
  }, []);

  // 2. Real-time Server-Sent Events (SSE) from Backend API + Background Polling
  useEffect(() => {
    let es = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      try {
        es = new EventSource(`${API_BASE}/events`);

        es.addEventListener('task_update', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.task) {
              setTasks(prev => {
                const match = prev.find(t => t.id === data.task.id || t.taskNumber === (data.task.taskNumber || data.task.id) || (data.task.title && t.title?.toLowerCase() === data.task.title?.toLowerCase()));
                if (match) {
                  return prev.map(t => t.id === match.id ? { ...t, ...data.task } : t);
                }
                return [data.task, ...prev];
              });
            }
          } catch (err) {
            console.error('Error parsing task_update event:', err);
          }
        });

        es.addEventListener('zoom_update', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'DELETE' && data.id) {
              setZoomRequests(prev => prev.filter(z => z.id !== data.id && z.id !== data.mappedId));
            } else if (data.zoomRequest) {
              setZoomRequests(prev => {
                const match = prev.find(z => z.id === data.zoomRequest.id || (data.zoomRequest.meetingName && z.meetingName?.toLowerCase() === data.zoomRequest.meetingName?.toLowerCase()));
                if (match) {
                  return prev.map(z => z.id === match.id ? { ...z, ...data.zoomRequest } : z);
                }
                return [data.zoomRequest, ...prev];
              });
            }
          } catch (err) {
            console.error('Error parsing zoom_update event:', err);
          }
        });

        es.addEventListener('ticket_update', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'DELETE' && data.id) {
              setTickets(prev => prev.filter(t => t.id !== data.id && t.ticketNumber !== data.id && t.id !== data.mappedId));
            } else if (data.ticket) {
              setTickets(prev => {
                const match = prev.find(t => t.id === data.ticket.id || t.ticketNumber === (data.ticket.ticketNumber || data.ticket.id));
                if (match) {
                  return prev.map(t => (t.id === match.id) ? { ...t, ...data.ticket } : t);
                }
                return [data.ticket, ...prev];
              });
            }
          } catch (err) {
            console.error('Error parsing ticket_update event:', err);
          }
        });

        es.addEventListener('repair_update', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'DELETE' && data.id) {
              setRepairs(prev => prev.filter(r => r.id !== data.id && r.referenceNumber !== data.id && r.id !== data.mappedId));
            } else if (data.repair) {
              setRepairs(prev => {
                const match = prev.find(r => r.id === data.repair.id || r.referenceNumber === (data.repair.referenceNumber || data.repair.id));
                if (match) {
                  return prev.map(r => (r.id === match.id || r.referenceNumber === match.referenceNumber) ? { ...r, ...data.repair } : r);
                }
                return [data.repair, ...prev];
              });
            }
          } catch (err) {
            console.error('Error parsing repair_update event:', err);
          }
        });

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          // Reconnect after 4s
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectSSE, 4000);
      }
    };

    connectSSE();

    // 3. Periodic Synchronization for tasks, meetings & tickets (Every 4 seconds + on tab focus)
    const refreshLiveResources = async () => {
      try {
        const [taskRes, zoomRes, ticketRes] = await Promise.allSettled([
          fetch(`${API_BASE}/tasks`),
          fetch(`${API_BASE}/zoom-requests`),
          fetch(`${API_BASE}/tickets`)
        ]);
        if (taskRes.status === 'fulfilled' && taskRes.value.ok) {
          const freshTasks = await taskRes.value.json().catch(() => null);
          if (Array.isArray(freshTasks) && freshTasks.length > 0) {
            setTasks(prev => mergeRemoteTasks(prev, freshTasks));
          }
        }
        if (zoomRes.status === 'fulfilled' && zoomRes.value.ok) {
          const freshZoom = await zoomRes.value.json().catch(() => null);
          if (Array.isArray(freshZoom) && freshZoom.length > 0) {
            setZoomRequests(prev => mergeRemoteZoom(prev, freshZoom));
          }
        }
        if (ticketRes.status === 'fulfilled' && ticketRes.value.ok) {
          const freshTickets = await ticketRes.value.json().catch(() => null);
          if (Array.isArray(freshTickets) && freshTickets.length > 0) {
            setTickets(prev => mergeRemoteTickets(prev, freshTickets));
          }
        }
      } catch (e) {
        // silent fallback
      }
    };

    const intervalTimer = setInterval(refreshLiveResources, 4000);
    const onWindowFocus = () => refreshLiveResources();
    window.addEventListener('focus', onWindowFocus);

    return () => {
      if (es) es.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, []);

  const apiCall = async (endpoint, method, body) => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
      });
      if (res.ok) {
        return await res.json().catch(() => null);
      }
    } catch (error) {
      console.warn(`API Error on ${method} ${endpoint}:`, error.message);
    }
    return null;
  };

  const addAuditLog = useCallback((userId, username, action, entityType, entityId, description, module) => {
    const entry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId, username, action, entityType, entityId, description, module,
    };
    setAuditLogs(prev => [entry, ...prev]);
    apiCall('/audit-logs', 'POST', entry);
  }, []);

  // --- ASSETS ---
  const createAsset = async (assetData, user) => {
    const newAsset = {
      id: `AST-${Date.now()}`,
      ...assetData,
      status: assetData.status || 'Active',
      createdAt: new Date().toISOString(),
    };
    setAssets(prev => [newAsset, ...prev]);
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'Asset', newAsset.id, `Added asset ${assetData.tag || assetData.brandModel}`, 'Asset Management');
    const serverResult = await apiCall('/assets', 'POST', assetData);
    if (serverResult) {
      setAssets(prev => prev.map(a => a.id === newAsset.id ? serverResult : a));
      return serverResult;
    }
    return newAsset;
  };

  // --- STOCK ---
  const updateStockStatus = (id, status, user) => {
    setStock(prev => prev.map(s => s.id === id ? { ...s, status, lastUpdated: new Date().toISOString().split('T')[0], updatedBy: user?.name || 'IT Staff' } : s));
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE', 'Stock', id, `Marked stock item ${id} as "${status}"`, 'Stock');
    apiCall(`/stock-items/${id}`, 'PATCH', { status, updatedBy: user?.name });
  };

  const updateStockQuantity = (id, quantity, user) => {
    setStock(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newStatus = quantity === 0 ? 'Not Available' : quantity <= s.minThreshold ? 'Low Stock' : 'Available';
      return { ...s, quantity, status: newStatus, lastUpdated: new Date().toISOString().split('T')[0], updatedBy: user?.name || 'IT Staff' };
    }));
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE', 'Stock', id, `Updated stock quantity for ${id} to ${quantity}`, 'Stock');
    apiCall(`/stock-items/${id}`, 'PATCH', { quantity, updatedBy: user?.name });
  };

  const createStockItem = async (stockData, user) => {
    const newItem = {
      id: `ST-${Date.now()}`,
      ...stockData,
      quantity: Number(stockData.quantity) || 0,
      minThreshold: Number(stockData.minThreshold) || 5,
      unit: stockData.unit || 'units',
      status: Number(stockData.quantity) === 0 ? 'Not Available' : Number(stockData.quantity) <= Number(stockData.minThreshold || 5) ? 'Low Stock' : 'Available',
      lastUpdated: new Date().toISOString().split('T')[0],
      updatedBy: user?.name || 'IT Staff',
    };
    setStock(prev => [newItem, ...prev]);
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'Stock', newItem.id, `Created stock item ${newItem.name}`, 'Stock');
    const serverResult = await apiCall('/stock-items', 'POST', stockData);
    if (serverResult) {
      setStock(prev => prev.map(s => s.id === newItem.id ? serverResult : s));
      return serverResult;
    }
    return newItem;
  };

  // --- TICKETS ---
  const updateTicketStatus = (id, status, user) => {
    const patch = { status, updatedAt: new Date().toISOString() };
    setTickets(prev => prev.map(t => (t.id === id || t.ticketNumber === id) ? { ...t, ...patch } : t));
    syncChannelRef.current?.postMessage({ type: 'TICKET_UPDATED', payload: { id, ...patch } });
    addAuditLog(user?.id, user?.username || user?.name, 'STATUS_CHANGE', 'Ticket', id, `Changed ticket status to "${status}"`, 'Helpdesk');
    apiCall(`/tickets/${id}/status`, 'PATCH', { status });
  };

  const assignTicket = (id, assigneeId, user) => {
    const patch = { assignedTo: assigneeId, status: 'Assigned', reassignmentRequest: null, updatedAt: new Date().toISOString() };
    setTickets(prev => prev.map(t => (t.id === id || t.ticketNumber === id) ? { ...t, ...patch } : t));
    syncChannelRef.current?.postMessage({ type: 'TICKET_UPDATED', payload: { id, ...patch } });
    addAuditLog(user?.id, user?.username || user?.name, 'ASSIGN', 'Ticket', id, `Assigned ticket to user ${assigneeId}`, 'Helpdesk');

    // Send direct assignment alert to assigned member
    const targetTicket = tickets.find(t => t.id === id || t.ticketNumber === id);
    if (notifyWorkAssignment && assigneeId) {
      notifyWorkAssignment({
        type: 'ticket',
        workId: id,
        workTitle: targetTicket?.title || `Ticket ${id}`,
        assigneeId,
        assignedBy: user?.name || user?.username || 'IT Admin',
      });
    }

    apiCall(`/tickets/${id}/assign`, 'PATCH', { assigneeId });
  };

  const submitReassignmentRequest = (ticketId, reason, user) => {
    const request = { id: `RR-${Date.now()}`, requestedBy: user?.id, reason, requestedAt: new Date().toISOString(), status: 'Pending' };
    const patch = { reassignmentRequest: request, updatedAt: new Date().toISOString() };
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticketNumber === ticketId) ? { ...t, ...patch } : t));
    syncChannelRef.current?.postMessage({ type: 'TICKET_UPDATED', payload: { id: ticketId, ...patch } });
    addAuditLog(user?.id, user?.username || user?.name, 'REASSIGN_REQUEST', 'Ticket', ticketId, `Submitted reassignment request: ${reason}`, 'Helpdesk');
    apiCall(`/tickets/${ticketId}/reassign`, 'POST', request);
  };

  const rejectReassignmentRequest = (ticketId, reason, user) => {
    let updatedTicket = null;
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId && t.ticketNumber !== ticketId) return t;
      const updatedReq = t.reassignmentRequest ? {
        ...t.reassignmentRequest,
        status: 'Rejected',
        rejectedBy: user?.id,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Reassignment request was rejected by IT Admin.'
      } : null;
      updatedTicket = { ...t, reassignmentRequest: updatedReq, updatedAt: new Date().toISOString() };
      return updatedTicket;
    }));
    if (updatedTicket) {
      syncChannelRef.current?.postMessage({ type: 'TICKET_UPDATED', payload: updatedTicket });
    }
    addAuditLog(user?.id, user?.username || user?.name, 'REJECT_REASSIGN', 'Ticket', ticketId, `Rejected reassignment request${reason ? `: ${reason}` : ''}`, 'Helpdesk');
    apiCall(`/tickets/${ticketId}/reassign/reject`, 'PATCH', { reason, rejectedBy: user?.id });
  };

  const createTicket = async (ticketData, user) => {
    const finalStatus = ticketData.status || (ticketData.assignedTo ? 'Assigned' : 'New');
    const newTicket = {
      id: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      ticketNumber: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      ...ticketData,
      status: finalStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partsUsed: [],
      reassignmentRequest: null
    };
    setTickets(prev => [newTicket, ...prev]);
    syncChannelRef.current?.postMessage({ type: 'TICKET_UPDATED', payload: newTicket });
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'Ticket', newTicket.id, `Created new ticket: ${ticketData.title}`, 'Helpdesk');
    
    const serverResult = await apiCall('/tickets', 'POST', {
      ...ticketData,
      requesterId: user?.id,
      status: finalStatus
    });
    if (serverResult && serverResult.id) {
      setTickets(prev => prev.map(t => t.id === newTicket.id ? { ...newTicket, ...serverResult } : t));
      syncChannelRef.current?.postMessage({ type: 'TICKET_UPDATED', payload: { ...newTicket, ...serverResult } });
      return serverResult;
    }
    return newTicket;
  };

  const deleteTicket = (id, user) => {
    try {
      const deletedIds = JSON.parse(localStorage.getItem('itsm_deleted_ticket_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('itsm_deleted_ticket_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    setTickets(prev => prev.filter(t => t.id !== id && t.ticketNumber !== id));
    syncChannelRef.current?.postMessage({ type: 'TICKET_DELETED', payload: { id } });
    addAuditLog(user?.id, user?.username || user?.name, 'DELETE', 'Ticket', id, `Deleted ticket ${id}`, 'Helpdesk');
    apiCall(`/tickets/${id}`, 'DELETE');
  };

  // --- TASKS ---
  const updateTaskStatus = async (id, status, holdReason = '', user = null) => {
    const canonicalStatus = status === 'Pending' ? 'On Hold' : status;
    const patchPayload = {
      status: canonicalStatus,
      holdReason: (canonicalStatus === 'On Hold' || canonicalStatus === 'Hold') ? holdReason : '',
      updatedAt: new Date().toISOString()
    };

    setTasks(prev => prev.map(t => (t.id === id || t.taskNumber === id) ? { ...t, ...patchPayload } : t));
    syncChannelRef.current?.postMessage({ type: 'TASK_UPDATED', payload: { id, ...patchPayload } });

    const logDesc = (canonicalStatus === 'On Hold' || canonicalStatus === 'Hold') && holdReason
      ? `Changed task status to "${canonicalStatus}" (Reason: ${holdReason})`
      : `Changed task status to "${canonicalStatus}"`;
    addAuditLog(user?.id, user?.username || user?.name, 'STATUS_CHANGE', 'Task', id, logDesc, 'Task Management');

    const updated = await apiCall(`/tasks/${id}/status`, 'PATCH', { status: canonicalStatus, holdReason });
    if (updated) {
      setTasks(prev => prev.map(t => (t.id === id || t.taskNumber === id) ? { ...t, ...updated } : t));
      syncChannelRef.current?.postMessage({ type: 'TASK_UPDATED', payload: updated });
    }
  };

  const updateSubtaskStatus = (taskId, subtaskId, status, user) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId && t.taskNumber !== taskId) return t;
      const updatedSubtasks = (t.subtasks || []).map(s =>
        s.id === subtaskId ? { ...s, status, completedAt: status === 'Completed' ? new Date().toISOString() : null } : s
      );
      const completed = updatedSubtasks.filter(s => s.status === 'Completed').length;
      const progress = updatedSubtasks.length ? Math.round((completed / updatedSubtasks.length) * 100) : 0;
      const newStatus = progress === 100 ? 'Completed' : t.status === 'To Do' && progress > 0 ? 'In Progress' : t.status;
      
      const updatedTask = { ...t, subtasks: updatedSubtasks, status: newStatus, updatedAt: new Date().toISOString() };
      syncChannelRef.current?.postMessage({ type: 'TASK_UPDATED', payload: updatedTask });
      return updatedTask;
    }));
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE', 'Subtask', subtaskId, `Updated subtask status to "${status}"`, 'Task Management');
    apiCall(`/tasks/${taskId}/subtasks/${subtaskId}`, 'PATCH', { status });
  };

  const createTask = async (taskData, user) => {
    const newTask = {
      id: `TSK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      taskNumber: `TSK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      ...taskData,
      status: taskData.status || 'To Do',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: taskData.subtasks || []
    };
    setTasks(prev => [newTask, ...prev]);
    syncChannelRef.current?.postMessage({ type: 'TASK_UPDATED', payload: newTask });
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'Task', newTask.id, `Created task: ${taskData.title}`, 'Task Management');

    // Send direct assignment alert to each assigned member
    if (notifyWorkAssignment && Array.isArray(taskData.assignees)) {
      taskData.assignees.forEach(assigneeId => {
        notifyWorkAssignment({
          type: 'task',
          workId: newTask.id,
          workTitle: taskData.title,
          assigneeId,
          assignedBy: user?.name || user?.username || 'Supervisor',
        });
      });
    }
    const serverResult = await apiCall('/tasks', 'POST', { ...taskData, createdBy: user?.id });
    if (serverResult) {
      setTasks(prev => prev.map(t => t.id === newTask.id ? serverResult : t));
      syncChannelRef.current?.postMessage({ type: 'TASK_UPDATED', payload: serverResult });
      return serverResult;
    }
    return newTask;
  };

  // --- ZOOM ---
  const createZoomRequest = async (data, user) => {
    const newReq = {
      id: `ZM-${Date.now()}`,
      ...data,
      meetingLink: data.meetingLink || '',
      requestedBy: data.requestedBy || user?.id,
      status: data.status || (data.meetingLink ? 'Confirmed' : 'Pending'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setZoomRequests(prev => [newReq, ...prev]);
    syncChannelRef.current?.postMessage({ type: 'ZOOM_UPDATED', payload: newReq });
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'ZoomRequest', newReq.id, `Submitted Zoom request: ${data.meetingName}`, 'Zoom Support');
    const serverResult = await apiCall('/zoom-requests', 'POST', {
      ...data,
      requestedBy: data.requestedBy || user?.id,
      meetingLink: data.meetingLink || '',
      status: data.status || (data.meetingLink ? 'Confirmed' : 'Pending')
    });
    if (serverResult && serverResult.id) {
      setZoomRequests(prev => prev.map(z => z.id === newReq.id ? { ...newReq, ...serverResult } : z));
      syncChannelRef.current?.postMessage({ type: 'ZOOM_UPDATED', payload: { ...newReq, ...serverResult } });
      return serverResult;
    }
    return newReq;
  };

  const assignZoomRequest = (id, assigneeId, user) => {
    setZoomRequests(prev => prev.map(z => z.id === id ? { ...z, assignedTo: assigneeId, status: z.status === 'Pending' ? 'Confirmed' : z.status, updatedAt: new Date().toISOString() } : z));
    syncChannelRef.current?.postMessage({ type: 'ZOOM_UPDATED', payload: { id, assignedTo: assigneeId, updatedAt: new Date().toISOString() } });
    addAuditLog(user?.id, user?.username || user?.name, 'ASSIGN', 'ZoomRequest', id, `Assigned Zoom request to ${assigneeId}`, 'Zoom Support');
    apiCall(`/zoom-requests/${id}/assign`, 'PATCH', { assigneeId });
  };

  const updateZoomMeetingLink = (id, meetingLink, user) => {
    const patch = {
      meetingLink,
      linkUploadedBy: user?.id,
      linkUploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setZoomRequests(prev => prev.map(z => z.id === id ? {
      ...z,
      ...patch,
      status: z.status === 'Pending' ? 'Confirmed' : z.status,
    } : z));
    syncChannelRef.current?.postMessage({ type: 'ZOOM_UPDATED', payload: { id, ...patch } });
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE_LINK', 'ZoomRequest', id, `Uploaded Zoom meeting link for ${id}`, 'Zoom Support');
    apiCall(`/zoom-requests/${id}/link`, 'PATCH', { meetingLink, linkUploadedBy: user?.id });
  };

  const updateZoomStatus = (id, status, user) => {
    setZoomRequests(prev => prev.map(z => z.id === id ? { ...z, status, updatedAt: new Date().toISOString() } : z));
    syncChannelRef.current?.postMessage({ type: 'ZOOM_UPDATED', payload: { id, status, updatedAt: new Date().toISOString() } });
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE_STATUS', 'ZoomRequest', id, `Updated Zoom request status to ${status}`, 'Zoom Support');
    apiCall(`/zoom-requests/${id}/status`, 'PATCH', { status });
  };

  const deleteZoomRequest = (id, user) => {
    try {
      const deletedIds = JSON.parse(localStorage.getItem('itsm_deleted_zoom_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('itsm_deleted_zoom_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    setZoomRequests(prev => prev.filter(z => z.id !== id));
    syncChannelRef.current?.postMessage({ type: 'ZOOM_DELETED', payload: { id } });
    addAuditLog(user?.id, user?.username || user?.name, 'DELETE', 'ZoomRequest', id, `Deleted Zoom request ${id}`, 'Zoom Support');
    apiCall(`/zoom-requests/${id}`, 'DELETE');
  };

  // --- USERS ---
  const createUser = async (userData, currentUser) => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          ...userData,
          createdBy: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUsers(prev => [data, ...prev]);
      setDynamicUsers(prev => [data, ...prev]);
      addAuditLog(
        currentUser?.id,
        currentUser?.username || currentUser?.name,
        'CREATE',
        'User',
        data.id,
        `Created user account ${data.name} (${data.username}) with role ${data.roleName || data.role}`,
        'User Management'
      );
      return data;
    } catch (err) {
      console.error('createUser error:', err);
      throw err;
    }
  };

  const updateUserRole = (userId, newRole, user) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    addAuditLog(user?.id, user?.username || user?.name, 'PRIVILEGE_CHANGE', 'User', userId, `Changed role for user ${userId} to "${newRole}"`, 'User Management');
    apiCall(`/users/${userId}/role`, 'PATCH', { role: newRole });
  };

  const toggleUserActive = (userId, user) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !u.active } : u));
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE', 'User', userId, `Toggled active status for user ${userId}`, 'User Management');
    apiCall(`/users/${userId}/active`, 'PATCH', {});
  };

  const resetUserPassword = async (userId, newPassword, adminUser) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUser?.id || '',
        },
        body: JSON.stringify({ password: newPassword, adminUserId: adminUser?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      addAuditLog(
        adminUser?.id,
        adminUser?.username || adminUser?.name,
        'SECURITY',
        'User',
        userId,
        `Reset password for user ${userId}`,
        'Security'
      );
      return data;
    } catch (err) {
      console.error('resetUserPassword error:', err);
      throw err;
    }
  };

  // --- SYSTEM BROADCASTS ---
  const [broadcasts, setBroadcasts] = useState(() => {
    try {
      const saved = localStorage.getItem('itsm_broadcasts');
      return saved ? JSON.parse(saved) : [
        {
          id: 'bc-1',
          title: 'Scheduled Ministry Core Network Maintenance',
          message: 'Server infrastructure maintenance scheduled tonight from 22:00 to 23:00. Brief service intermittency may occur.',
          priority: 'Warning',
          audience: 'All',
          createdAt: new Date().toISOString(),
          active: true,
          author: 'IT Administrator',
        }
      ];
    } catch (e) {
      return [];
    }
  });

  const addBroadcast = (broadcastData, user) => {
    const newBc = {
      id: `bc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      active: true,
      author: user?.name || 'IT Administrator',
      ...broadcastData,
    };
    setBroadcasts(prev => {
      const updated = [newBc, ...prev];
      try { localStorage.setItem('itsm_broadcasts', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    addAuditLog(user?.id, user?.username || user?.name, 'BROADCAST', 'Announcement', newBc.id, `Broadcasted system announcement: "${newBc.title}"`, 'System Operations');
    return newBc;
  };

  const toggleBroadcast = (id) => {
    setBroadcasts(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, active: !b.active } : b);
      try { localStorage.setItem('itsm_broadcasts', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  const removeBroadcast = (id) => {
    setBroadcasts(prev => {
      const updated = prev.filter(b => b.id !== id);
      try { localStorage.setItem('itsm_broadcasts', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  // --- REPAIRS ---
  const createRepair = async (data, user) => {
    const newRepair = {
      id: `REP-${Date.now()}`,
      referenceNumber: `REP-${Date.now()}`,
      ...data,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRepairs(prev => [newRepair, ...prev]);
    syncChannelRef.current?.postMessage({ type: 'REPAIR_UPDATED', payload: newRepair });
    addAuditLog(user?.id, user?.username || user?.name, 'DISPATCH', 'Repair', newRepair.id, `Dispatched asset for repair: ${data.forReason}`, 'External Repairs');
    const serverResult = await apiCall('/repairs', 'POST', { ...data, assignedTo: user?.id });
    if (serverResult && serverResult.id) {
      setRepairs(prev => prev.map(r => r.id === newRepair.id ? { ...newRepair, ...serverResult } : r));
      syncChannelRef.current?.postMessage({ type: 'REPAIR_UPDATED', payload: { ...newRepair, ...serverResult } });
      return serverResult;
    }
    return newRepair;
  };

  const closeRepair = async (id, data, user) => {
    const cost = (data.totalCost !== undefined && data.totalCost !== null && data.totalCost !== '') ? parseFloat(data.totalCost) : null;
    const patch = {
      ...data,
      totalCost: cost,
      status: 'Closed',
      actualReturnDate: new Date().toISOString().split('T')[0],
      closedAt: new Date().toISOString(),
      closedBy: user?.name || user?.username || 'IT Staff',
      updatedAt: new Date().toISOString(),
    };

    setRepairs(prev => prev.map(r => (r.id === id || r.referenceNumber === id) ? { ...r, ...patch } : r));
    syncChannelRef.current?.postMessage({ type: 'REPAIR_UPDATED', payload: { id, ...patch } });
    addAuditLog(user?.id, user?.username || user?.name, 'CLOSE', 'Repair', id, `Closed repair job. Parts replaced: ${data.whatReplaced || 'N/A'}`, 'External Repairs');

    const res = await apiCall(`/repairs/${id}/close`, 'PATCH', patch);
    if (res) {
      setRepairs(prev => prev.map(r => (r.id === id || r.referenceNumber === id || r.id === res.id) ? { ...r, ...res, status: 'Closed' } : r));
      syncChannelRef.current?.postMessage({ type: 'REPAIR_UPDATED', payload: { ...res, status: 'Closed' } });
      return res;
    }
    return patch;
  };

  const deleteRepair = (id, user) => {
    try {
      const deletedIds = JSON.parse(localStorage.getItem('itsm_deleted_repair_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('itsm_deleted_repair_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    setRepairs(prev => prev.filter(r => r.id !== id && r.referenceNumber !== id));
    syncChannelRef.current?.postMessage({ type: 'REPAIR_DELETED', payload: { id } });
    addAuditLog(user?.id, user?.username || user?.name, 'DELETE', 'Repair', id, `Deleted repair record ${id}`, 'External Repairs');
    apiCall(`/repairs/${id}`, 'DELETE');
  };

  // --- PUBLICATIONS ---
  const createPublication = async (data, user) => {
    const newPub = {
      id: `PUB-${Date.now()}`,
      ...data,
      status: 'Pending Review',
      requestedBy: user?.id,
      requestedAt: new Date().toISOString(),
      publishedBy: null,
      approvedBy: null,
      publishedAt: null
    };
    setPublications(prev => [newPub, ...prev]);
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'Publication', newPub.id, `Submitted publication request: ${data.title}`, 'Web Publication');
    const serverResult = await apiCall('/publications', 'POST', { ...data, requestedBy: user?.id });
    if (serverResult) {
      setPublications(prev => prev.map(p => p.id === newPub.id ? serverResult : p));
      return serverResult;
    }
    return newPub;
  };

  const approvePublication = (id, user) => {
    setPublications(prev => prev.map(p => p.id === id ? { ...p, status: 'Published', approvedBy: user?.id, publishedBy: user?.id, publishedAt: new Date().toISOString() } : p));
    addAuditLog(user?.id, user?.username || user?.name, 'PUBLISH', 'Publication', id, `Approved and published publication ${id}`, 'Web Publication');
    apiCall(`/publications/${id}/approve`, 'PATCH', { approvedBy: user?.id });
  };

  // Helper getters
  const getUser = useCallback((id) => {
    if (!id) return null;
    return users.find(u => u.id === id || u.username?.toLowerCase() === id.toLowerCase() || u.name?.toLowerCase() === id.toLowerCase()) || null;
  }, [users]);

  const getAsset = useCallback((id) => {
    if (!id) return null;
    return assets.find(a => a.id === id || a.tag === id || a.serial === id) || null;
  }, [assets]);

  const getTicketStats = useCallback(() => helperGetTicketStats(tickets), [tickets]);
  const getTaskStats = useCallback((userId = null) => helperGetTaskStats(userId, tasks), [tasks]);

  return (
    <DataContext.Provider value={{
      divisions, assets, stock, tickets, repairs, vendors, zoomRequests, publications, tasks, auditLogs, users, loading,
      fetchAllData,
      getUser, getAsset, getTicketStats, getTaskStats,
      createAsset,
      updateStockStatus, updateStockQuantity, createStockItem,
      updateTicketStatus, assignTicket, submitReassignmentRequest, rejectReassignmentRequest, createTicket, deleteTicket,
      updateTaskStatus, updateSubtaskStatus, createTask,
      createZoomRequest, assignZoomRequest, updateZoomMeetingLink, updateZoomStatus, deleteZoomRequest,
      createUser, updateUserRole, toggleUserActive, resetUserPassword,
      broadcasts, addBroadcast, toggleBroadcast, removeBroadcast,
      createRepair, closeRepair, deleteRepair,
      createPublication, approvePublication,
      addAuditLog,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
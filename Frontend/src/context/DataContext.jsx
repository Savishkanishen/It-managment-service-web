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

export function DataProvider({ children }) {
  const { notifyWorkAssignment } = useNotifications() || {};
  const [divisions, setDivisions] = useState(DIVISIONS);
  const [assets, setAssets] = useState(ASSETS);
  const [stock, setStock] = useState(STOCK_ITEMS);
  const [tickets, setTickets] = useState(TICKETS);
  const [repairs, setRepairs] = useState(REPAIRS);
  const [vendors, setVendors] = useState(VENDORS);
  const [zoomRequests, setZoomRequests] = useState(ZOOM_REQUESTS);
  const [publications, setPublications] = useState(PUBLICATIONS);
  const [tasks, setTasks] = useState(TASKS);
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

  // Initial Data Fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const endpoints = [
      { key: 'divisions', url: '/divisions', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          // If objects, extract names or keep as is
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
        if (Array.isArray(data) && data.length > 0) setTickets(data);
      }},
      { key: 'repairs', url: '/repairs', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setRepairs(data);
      }},
      { key: 'vendors', url: '/vendors', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setVendors(data);
      }},
      { key: 'zoomRequests', url: '/zoom-requests', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setZoomRequests(data);
      }},
      { key: 'publications', url: '/publications', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setPublications(data);
      }},
      { key: 'tasks', url: '/tasks', setter: (data) => {
        if (Array.isArray(data) && data.length > 0) setTasks(data);
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
    setTickets(prev => prev.map(t => (t.id === id || t.ticketNumber === id) ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    addAuditLog(user?.id, user?.username || user?.name, 'STATUS_CHANGE', 'Ticket', id, `Changed ticket status to "${status}"`, 'Helpdesk');
    apiCall(`/tickets/${id}/status`, 'PATCH', { status });
  };

  const assignTicket = (id, assigneeId, user) => {
    setTickets(prev => prev.map(t => (t.id === id || t.ticketNumber === id) ? { ...t, assignedTo: assigneeId, status: t.status === 'New' ? 'Assigned' : t.status, reassignmentRequest: null, updatedAt: new Date().toISOString() } : t));
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
    setTickets(prev => prev.map(t => (t.id === ticketId || t.ticketNumber === ticketId) ? { ...t, reassignmentRequest: request, updatedAt: new Date().toISOString() } : t));
    addAuditLog(user?.id, user?.username || user?.name, 'REASSIGN_REQUEST', 'Ticket', ticketId, `Submitted reassignment request: ${reason}`, 'Helpdesk');
    apiCall(`/tickets/${ticketId}/reassign`, 'POST', request);
  };

  const rejectReassignmentRequest = (ticketId, reason, user) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId && t.ticketNumber !== ticketId) return t;
      const updatedReq = t.reassignmentRequest ? {
        ...t.reassignmentRequest,
        status: 'Rejected',
        rejectedBy: user?.id,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Reassignment request was rejected by IT Admin.'
      } : null;
      return { ...t, reassignmentRequest: updatedReq, updatedAt: new Date().toISOString() };
    }));
    addAuditLog(user?.id, user?.username || user?.name, 'REJECT_REASSIGN', 'Ticket', ticketId, `Rejected reassignment request${reason ? `: ${reason}` : ''}`, 'Helpdesk');
    apiCall(`/tickets/${ticketId}/reassign/reject`, 'PATCH', { reason, rejectedBy: user?.id });
  };

  const createTicket = async (ticketData, user) => {
    const newTicket = {
      id: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      ticketNumber: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      ...ticketData,
      status: 'New',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partsUsed: [],
      reassignmentRequest: null
    };
    setTickets(prev => [newTicket, ...prev]);
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'Ticket', newTicket.id, `Created new ticket: ${ticketData.title}`, 'Helpdesk');
    
    const serverResult = await apiCall('/tickets', 'POST', { ...ticketData, requesterId: user?.id });
    if (serverResult) {
      setTickets(prev => prev.map(t => t.id === newTicket.id ? serverResult : t));
      return serverResult;
    }
    return newTicket;
  };

  // --- TASKS ---
  const updateTaskStatus = (id, status, holdReason = '', user = null) => {
    setTasks(prev => prev.map(t => (t.id === id || t.taskNumber === id) ? {
      ...t,
      status,
      holdReason: (status === 'On Hold' || status === 'Hold') ? holdReason : (t.holdReason || ''),
      updatedAt: new Date().toISOString()
    } : t));
    const logDesc = (status === 'On Hold' || status === 'Hold') && holdReason
      ? `Changed task status to "${status}" (Reason: ${holdReason})`
      : `Changed task status to "${status}"`;
    addAuditLog(user?.id, user?.username || user?.name, 'STATUS_CHANGE', 'Task', id, logDesc, 'Task Management');
    apiCall(`/tasks/${id}/status`, 'PATCH', { status, holdReason });
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
      
      return { ...t, subtasks: updatedSubtasks, status: newStatus, updatedAt: new Date().toISOString() };
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
      return serverResult;
    }
    return newTask;
  };

  // --- ZOOM ---
  const createZoomRequest = async (data, user) => {
    const newReq = {
      id: `ZM-${Date.now()}`,
      ...data,
      meetingLink: '',
      requestedBy: user?.id,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    setZoomRequests(prev => [newReq, ...prev]);
    addAuditLog(user?.id, user?.username || user?.name, 'CREATE', 'ZoomRequest', newReq.id, `Submitted Zoom request: ${data.meetingName}`, 'Zoom Support');
    const serverResult = await apiCall('/zoom-requests', 'POST', { ...data, requestedBy: user?.id });
    if (serverResult) {
      setZoomRequests(prev => prev.map(z => z.id === newReq.id ? serverResult : z));
      return serverResult;
    }
    return newReq;
  };

  const assignZoomRequest = (id, assigneeId, user) => {
    setZoomRequests(prev => prev.map(z => z.id === id ? { ...z, assignedTo: assigneeId, status: z.status === 'Pending' ? 'Confirmed' : z.status } : z));
    addAuditLog(user?.id, user?.username || user?.name, 'ASSIGN', 'ZoomRequest', id, `Assigned Zoom request to ${assigneeId}`, 'Zoom Support');
    apiCall(`/zoom-requests/${id}/assign`, 'PATCH', { assigneeId });
  };

  const updateZoomMeetingLink = (id, meetingLink, user) => {
    setZoomRequests(prev => prev.map(z => z.id === id ? {
      ...z,
      meetingLink,
      linkUploadedBy: user?.id,
      linkUploadedAt: new Date().toISOString(),
      status: z.status === 'Pending' ? 'Confirmed' : z.status,
    } : z));
    addAuditLog(user?.id, user?.username || user?.name, 'UPDATE_LINK', 'ZoomRequest', id, `Uploaded Zoom meeting link for ${id}`, 'Zoom Support');
    apiCall(`/zoom-requests/${id}/link`, 'PATCH', { meetingLink, linkUploadedBy: user?.id });
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

  // --- REPAIRS ---
  const createRepair = async (data, user) => {
    const newRepair = {
      id: `REP-${Date.now()}`,
      referenceNumber: `REP-${Date.now()}`,
      ...data,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    setRepairs(prev => [newRepair, ...prev]);
    addAuditLog(user?.id, user?.username || user?.name, 'DISPATCH', 'Repair', newRepair.id, `Dispatched asset for repair: ${data.forReason}`, 'External Repairs');
    const serverResult = await apiCall('/repairs', 'POST', { ...data, assignedTo: user?.id });
    if (serverResult) {
      setRepairs(prev => prev.map(r => r.id === newRepair.id ? serverResult : r));
      return serverResult;
    }
    return newRepair;
  };

  const closeRepair = async (id, data, user) => {
    setRepairs(prev => prev.map(r => (r.id === id || r.referenceNumber === id) ? { ...r, ...data, status: 'Closed' } : r));
    addAuditLog(user?.id, user?.username || user?.name, 'CLOSE', 'Repair', id, `Closed repair job. Parts replaced: ${data.whatReplaced}`, 'External Repairs');
    const res = await apiCall(`/repairs/${id}/close`, 'PATCH', data);
    if (res) {
      setRepairs(prev => prev.map(r => (r.id === id || r.referenceNumber === id || r.id === res.id) ? res : r));
    }
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
      updateTicketStatus, assignTicket, submitReassignmentRequest, rejectReassignmentRequest, createTicket,
      updateTaskStatus, updateSubtaskStatus, createTask,
      createZoomRequest, assignZoomRequest, updateZoomMeetingLink,
      createUser, updateUserRole, toggleUserActive,
      createRepair, closeRepair,
      createPublication, approvePublication,
      addAuditLog,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext(null);

const DEFAULT_NOTIFICATIONS = [
  { id: 'N001', type: 'warning', title: 'Overdue Repair', message: 'REP-2026-001 (PC003) has exceeded expected return date', read: false, time: '2h ago' },
  { id: 'N002', type: 'info', title: 'Reassignment Request', message: 'Hassan Waheed requested reassignment for TKT-2026-003', read: false, time: '4h ago' },
  { id: 'N003', type: 'warning', title: 'Low Stock Alert', message: 'Cat6 Network Cable (1m) is below minimum threshold (8/10)', read: false, time: '1d ago' },
  { id: 'N004', type: 'success', title: 'Task Completed', message: 'Server Room Cable Management (TSK-2026-004) marked complete', read: true, time: '2d ago' },
];

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('itsm_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    return DEFAULT_NOTIFICATIONS;
  });

  // Save to local storage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem('itsm_notifications', JSON.stringify(notifications));
    } catch (e) {
      // Ignore storage errors
    }
  }, [notifications]);

  const addToast = useCallback((type, title, message, duration = 4500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = (targetUserId = null) => {
    setNotifications(prev => prev.map(n => {
      if (!targetUserId) return { ...n, read: true };
      const tid = String(n.targetUserId || '').toLowerCase();
      const uid = String(targetUserId).toLowerCase();
      if (!n.targetUserId || tid === uid) {
        return { ...n, read: true };
      }
      return n;
    }));
  };

  /**
   * Dispatches an assignment alert notification targeted exclusively to a specific member
   */
  const notifyWorkAssignment = useCallback(({ type, workId, workTitle, assigneeId, assigneeName, assignedBy }) => {
    if (!assigneeId) return;

    const notifTitle = type === 'task' ? '📋 New Task Assigned' : '🎫 New Ticket Assigned';
    const notifMessage = `You have been assigned to ${type === 'task' ? 'Task' : 'Ticket'} ${workId}: "${workTitle}"${assignedBy ? ` by ${assignedBy}` : ''}.`;

    const newNotification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'info',
      title: notifTitle,
      message: notifMessage,
      time: 'Just now',
      read: false,
      targetUserId: assigneeId,
      targetUserName: assigneeName,
      workId,
      workType: type,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Check if current user in localStorage is the assignee
    try {
      const activeUserStr = localStorage.getItem('itsm_user');
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        const uid = String(activeUser.id || '').toLowerCase();
        const uname = String(activeUser.username || '').toLowerCase();
        const target = String(assigneeId).toLowerCase();

        if (target === uid || target === uname) {
          addToast('info', notifTitle, notifMessage, 6000);
        }
      }
    } catch (e) { }
  }, [addToast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      toasts,
      notifications,
      addToast,
      removeToast,
      markRead,
      markAllRead,
      notifyWorkAssignment,
      unreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

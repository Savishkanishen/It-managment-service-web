import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import HoldReasonModal from '../../components/ui/HoldReasonModal';
import { calcTaskProgress, isTaskAssignedToUser, ROLES, getUser } from '../../data/mockData';
import { CheckSquare, Clock, ArrowRight, Trash2, Kanban, Calendar, Layers, UserCheck, ShieldAlert } from 'lucide-react';

export default function MyTasksPage() {
  const { tasks, updateTaskStatus, deleteTask } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [holdModalTask, setHoldModalTask] = useState(null);

  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser?.role) || currentUser?.username?.toLowerCase() === 'admin';
  const [adminScope, setAdminScope] = useState('all'); // 'all' (default: everyone's tasks) | 'mine' (admin's direct tasks)

  const myAssignedCount = tasks.filter(t => isTaskAssignedToUser(t, currentUser)).length;

  // In admin view: show everyone's tasks by default (admin master control); non-admins strictly see only their own assigned tasks
  const myTasks = isAdmin
    ? (adminScope === 'mine' ? tasks.filter(t => isTaskAssignedToUser(t, currentUser)) : tasks)
    : tasks.filter(t => isTaskAssignedToUser(t, currentUser));

  const mySubtasks = isAdmin
    ? (adminScope === 'mine'
        ? myTasks.flatMap(t => (t.subtasks || []).filter(s => isTaskAssignedToUser({ assignees: [s.assignee] }, currentUser)).map(s => ({ ...s, taskId: t.taskNumber || t.id, taskTitle: t.title })))
        : tasks.flatMap(t => (t.subtasks || []).map(s => ({ ...s, taskId: t.taskNumber || t.id, taskTitle: t.title })))
      )
    : myTasks.flatMap(t => (t.subtasks || []).filter(s => isTaskAssignedToUser({ assignees: [s.assignee] }, currentUser)).map(s => ({ ...s, taskId: t.taskNumber || t.id, taskTitle: t.title })));

  const today = new Date();
  const active = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const completed = myTasks.filter(t => t.status === 'Completed');
  const overdue = myTasks.filter(t => new Date(t.dueDate) < today && t.status !== 'Completed' && t.status !== 'Cancelled');

  const handleStatusChange = (task, newStatus) => {
    if (newStatus === 'Cancelled' && !isAdmin) {
      addToast('error', 'Permission Denied', 'Only administrators can cancel tasks.');
      return;
    }
    if (newStatus === 'On Hold' || newStatus === 'Hold' || newStatus === 'Pending') {
      setHoldModalTask(task);
    } else {
      updateTaskStatus(task.id, newStatus, '', currentUser);
      if (newStatus === 'Completed') {
        addToast('success', 'Task Completed', `Task "${task.title}" marked Completed and archived in database.`);
      } else if (newStatus === 'Cancelled') {
        addToast('warning', 'Task Cancelled', `Task "${task.title}" marked Cancelled.`);
      } else {
        addToast('success', 'Status Updated', `Task "${task.title}" updated to ${newStatus}`);
      }
    }
  };

  const handleHoldSubmit = (reason) => {
    if (!holdModalTask) return;
    updateTaskStatus(holdModalTask.id, 'On Hold', reason, currentUser);
    addToast('warning', 'Task On Hold', `Task "${holdModalTask.title}" placed on hold.`);
    setHoldModalTask(null);
  };

  const handleDelete = (task) => {
    if (!isAdmin) {
      addToast('error', 'Permission Denied', 'Only administrators can delete tasks.');
      return;
    }
    if (window.confirm(`Permanently delete task "${task.title}" (${task.taskNumber || task.id}) from the database?`)) {
      deleteTask(task.id, currentUser);
      addToast('warning', 'Task Deleted', `Task "${task.title}" permanently deleted.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAdmin ? "Department Tasks (Admin View)" : "My Tasks"}</h1>
          <p>
            {isAdmin
              ? "Administrator master view: Oversee everyone's tasks across the team. Full authority to modify, cancel, or delete."
              : "Tasks and subtasks assigned directly to your account"}
          </p>
        </div>
        <div className="page-header-actions">
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, background: 'var(--gray-100)', padding: 3, borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setAdminScope('all')}
                style={{
                  border: 'none',
                  background: adminScope === 'all' ? 'white' : 'transparent',
                  fontWeight: adminScope === 'all' ? 700 : 500,
                  color: adminScope === 'all' ? 'var(--teal-700)' : 'var(--gray-600)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: adminScope === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <Layers size={13} /> Everyone's Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminScope('mine')}
                style={{
                  border: 'none',
                  background: adminScope === 'mine' ? 'white' : 'transparent',
                  fontWeight: adminScope === 'mine' ? 700 : 500,
                  color: adminScope === 'mine' ? 'var(--teal-700)' : 'var(--gray-600)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: adminScope === 'mine' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <UserCheck size={13} /> Assigned to Me ({myAssignedCount})
              </button>
            </div>
          )}
          <Link to="/tasks/board" className="btn btn-secondary btn-sm"><Kanban size={14} /> Board</Link>
          <Link to="/tasks/calendar" className="btn btn-secondary btn-sm"><Calendar size={14} /> Calendar</Link>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: isAdmin && adminScope === 'all' ? 'All Tasks' : 'Total Assigned', value: myTasks.length, color: 'var(--teal-500)' },
          { label: 'Active', value: active.length, color: 'var(--warning-500)' },
          { label: 'Completed', value: completed.length, color: 'var(--success-500)' },
          { label: 'Overdue', value: overdue.length, color: 'var(--danger-500)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--stat-accent': s.color }}>
            <div className="stat-content"><div className="stat-label">{s.label}</div><div className="stat-value" style={{ color: s.color }}>{s.value}</div></div>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="alert-card alert-card-error" style={{ borderRadius: 'var(--radius-lg)', padding: '14px 20px', marginBottom: 20 }}>
          <div className="alert-title">⚠ {overdue.length} task{overdue.length > 1 ? 's' : ''} overdue</div>
          <div className="alert-message">{overdue.map(t => t.title).join(', ')}</div>
        </div>
      )}

      <div className="card-grid">
        {/* Active Tasks */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {isAdmin && adminScope === 'all' ? `All Active Tasks (${active.length})` : `Active Tasks (${active.length})`}
            </span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {active.map(t => {
              const progress = calcTaskProgress(t);
              const isOverdue = new Date(t.dueDate) < today;
              const isOnHold = t.status === 'On Hold' || t.status === 'Hold';
              return (
                <div key={t.id} style={{ border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: 12, borderLeftColor: isOverdue ? 'var(--danger-500)' : undefined, borderLeftWidth: isOverdue ? 3 : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <span className="id-chip">{t.taskNumber || t.id}</span>
                        <Badge status={t.status} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.title}</div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </div>

                  {/* Assignees chips for quick identification */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>Assignees:</span>
                    <div className="avatar-stack">
                      {(t.assignees || []).slice(0, 3).map(id => {
                        const u = getUser(id);
                        return u ? (
                          <div key={id} className="avatar avatar-sm" style={{ background: 'var(--teal-500)' }} title={`${u.name} (${u.role || 'Staff'})`}>
                            {(u.avatar || u.name.slice(0, 2)).toUpperCase()}
                          </div>
                        ) : null;
                      })}
                      {(!t.assignees || t.assignees.length === 0) && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </div>
                  </div>

                  {isOnHold && t.holdReason && (
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', marginBottom: 10 }}>
                      <strong>Hold Reason:</strong> {t.holdReason}
                    </div>
                  )}

                  <ProgressBar value={progress} size="sm" showLabel={false} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{progress}% complete</span>
                    <span style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--danger-500)' : 'var(--gray-500)', fontWeight: isOverdue ? 700 : 400 }}>
                      {isOverdue ? '⚠ Overdue' : 'Due'}: {t.dueDate}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Status:</span>
                      <select
                        className="filter-input"
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        value={t.status === 'On Hold' ? 'Pending' : t.status}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Pending">Pending (On Hold)</option>
                        <option value="Completed">Completed</option>
                        {isAdmin && <option value="Cancelled">Cancelled (Admin)</option>}
                      </select>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Link to={`/tasks/${t.taskNumber || t.id}`} className="btn btn-secondary btn-sm">
                        {isAdmin ? 'Manage & Modify' : 'View & Update'} <ArrowRight size={12} />
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 28, height: 28, color: 'var(--danger-500)' }}
                          title="Delete task (Admin only)"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {active.length === 0 && <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}><CheckSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} /><div>No active tasks!</div></div>}
          </div>
        </div>

        {/* Subtasks */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {isAdmin && adminScope === 'all' ? `Department Subtasks (${mySubtasks.length})` : `My Subtasks (${mySubtasks.length})`}
            </span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {mySubtasks.map(s => {
              const assigneeObj = getUser(s.assignee);
              return (
                <div key={s.id} className="subtask-item">
                  <div className={`subtask-check ${s.status === 'Completed' ? 'checked' : ''}`}>
                    {s.status === 'Completed' && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2" fill="none" /></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={`subtask-title ${s.status === 'Completed' ? 'done' : ''}`}>{s.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link to={`/tasks/${s.taskId}`} style={{ color: 'var(--teal-600)' }}>{s.taskTitle}</Link>
                      {assigneeObj && (
                        <span style={{ color: 'var(--gray-500)' }}>
                          • Assigned: <strong>{assigneeObj.name}</strong>
                        </span>
                      )}
                      {s.dueDate && <span>· Due {s.dueDate}</span>}
                    </div>
                  </div>
                  <Badge status={s.status} />
                </div>
              );
            })}
            {mySubtasks.length === 0 && <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>No subtasks assigned</div>}
          </div>
        </div>
      </div>

      {/* Hold Reason Modal */}
      <HoldReasonModal
        isOpen={!!holdModalTask}
        onClose={() => setHoldModalTask(null)}
        onSubmit={handleHoldSubmit}
        taskTitle={holdModalTask?.title || ''}
      />
    </div>
  );
}

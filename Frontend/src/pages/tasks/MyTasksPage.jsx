import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import HoldReasonModal from '../../components/ui/HoldReasonModal';
import { calcTaskProgress, isTaskAssignedToUser } from '../../data/mockData';
import { CheckSquare, Clock, ArrowRight } from 'lucide-react';

export default function MyTasksPage() {
  const { tasks, updateTaskStatus } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [holdModalTask, setHoldModalTask] = useState(null);

  const uid = String(currentUser?.id || '').toLowerCase();
  const uname = String(currentUser?.username || '').toLowerCase();

  const myTasks = tasks.filter(t => isTaskAssignedToUser(t, currentUser));
  const mySubtasks = myTasks.flatMap(t => (t.subtasks || []).filter(s => {
    return isTaskAssignedToUser({ assignees: [s.assignee] }, currentUser);
  }).map(s => ({ ...s, taskId: t.taskNumber || t.id, taskTitle: t.title })));

  const today = new Date();
  const active = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const completed = myTasks.filter(t => t.status === 'Completed');
  const overdue = myTasks.filter(t => new Date(t.dueDate) < today && t.status !== 'Completed' && t.status !== 'Cancelled');

  const handleStatusChange = (task, newStatus) => {
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

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Tasks</h1>
          <p>Tasks and subtasks assigned directly to you</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Assigned', value: myTasks.length, color: 'var(--teal-500)' },
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
          <div className="card-header"><span className="card-title">Active Tasks ({active.length})</span></div>
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
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <Link to={`/tasks/${t.taskNumber || t.id}`} className="btn btn-secondary btn-sm">
                      View & Update <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
            {active.length === 0 && <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}><CheckSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} /><div>No active tasks!</div></div>}
          </div>
        </div>

        {/* My Subtasks */}
        <div className="card">
          <div className="card-header"><span className="card-title">My Subtasks ({mySubtasks.length})</span></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {mySubtasks.map(s => (
              <div key={s.id} className="subtask-item">
                <div className={`subtask-check ${s.status === 'Completed' ? 'checked' : ''}`}>
                  {s.status === 'Completed' && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2" fill="none" /></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`subtask-title ${s.status === 'Completed' ? 'done' : ''}`}>{s.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                    <Link to={`/tasks/${s.taskId}`} style={{ color: 'var(--teal-600)' }}>{s.taskTitle}</Link>
                    {s.dueDate && <span> · Due {s.dueDate}</span>}
                  </div>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
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

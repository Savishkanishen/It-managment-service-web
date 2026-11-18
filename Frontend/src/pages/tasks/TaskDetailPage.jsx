import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import HoldReasonModal from '../../components/ui/HoldReasonModal';
import { calcTaskProgress, getUser, ROLES, isTaskAssignedToUser } from '../../data/mockData';
import { ArrowLeft, CheckSquare, User, Calendar, Flag, Plus, Check, PauseCircle, Lock } from 'lucide-react';

export default function TaskDetailPage() {
  const { id } = useParams();
  const { tasks, updateTaskStatus, updateSubtaskStatus } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [showHoldModal, setShowHoldModal] = useState(false);

  const task = tasks.find(t => t.id === id);
  if (!task) return <div style={{ padding:40, textAlign:'center', color:'var(--gray-400)' }}>Task not found</div>;

  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser.role);
  if (!isAdmin && !isTaskAssignedToUser(task, currentUser)) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--danger-500)', marginBottom: '16px' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Private Work Item</h2>
        <p style={{ color: 'var(--gray-500)', maxWidth: 440, margin: '0 auto 20px', fontSize: '0.875rem' }}>
          This task is assigned to another member. You do not have permission to view other members' assigned works.
        </p>
        <Link to="/tasks/list" className="btn btn-secondary">Back to Task List</Link>
      </div>
    );
  }

  const progress = calcTaskProgress(task);
  const assignees = (task.assignees || []).map(id => getUser(id)).filter(Boolean);
  const isAssignee = (task.assignees || []).includes(currentUser.id);
  const isTrainee = currentUser.role === ROLES.TRAINEE;

  const canEditStatus = isAdmin || isAssignee || isTrainee;

  const handleSubtaskToggle = (subtask) => {
    const newStatus = subtask.status === 'Completed' ? 'In Progress' : 'Completed';
    updateSubtaskStatus(task.id, subtask.id, newStatus, currentUser);
    addToast('success', 'Subtask Updated', `"${subtask.title}" marked as ${newStatus}`);
  };

  const handleStatusChange = (status) => {
    if (status === 'On Hold' || status === 'Hold') {
      setShowHoldModal(true);
    } else {
      updateTaskStatus(task.id, status, '', currentUser);
      addToast('success', 'Status Updated', `Task moved to "${status}"`);
    }
  };

  const handleHoldSubmit = (reason) => {
    updateTaskStatus(task.id, 'On Hold', reason, currentUser);
    addToast('warning', 'Task On Hold', `Task placed on hold.`);
    setShowHoldModal(false);
  };

  const today = new Date();
  const isOverdue = new Date(task.dueDate) < today && task.status !== 'Completed';
  const isOnHold = task.status === 'On Hold' || task.status === 'Hold';

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <Link to="/tasks/list" className="btn btn-ghost btn-sm" style={{ paddingLeft:0 }}><ArrowLeft size={15} /> Back to Tasks</Link>
      </div>

      {/* Header */}
      <div className="detail-header" style={isOverdue ? { borderLeft:'4px solid var(--danger-500)' } : {}}>
        <div className="detail-icon" style={{ background:'rgba(6,182,212,0.1)' }}>
          <CheckSquare size={28} color="var(--teal-500)" />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="detail-title">{task.title}</div>
          <div className="detail-meta">
            <span className="id-chip">{task.id}</span>
            <PriorityBadge priority={task.priority} />
            <Badge status={task.status} />
            {isOverdue && <span className="badge badge-red">Overdue</span>}
          </div>
        </div>
        {canEditStatus && (
          <div className="detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)' }}>Change Status:</span>
            <select className="filter-input" value={task.status} onChange={e => handleStatusChange(e.target.value)}>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Ongoing">Ongoing</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {isOnHold && (
        <div className="alert-card alert-card-warning" style={{ marginBottom: 20, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <PauseCircle size={22} color="var(--warning-600)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="alert-title" style={{ fontSize: '0.95rem' }}>Task is currently On Hold</div>
            <div className="alert-message" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              <strong>Reason for Hold:</strong> {task.holdReason || 'No reason specified.'}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <span className="card-title">Overall Progress</span>
          <span style={{ fontWeight:800, fontSize:'1.2rem', color: progress === 100 ? 'var(--success-500)' : 'var(--teal-600)' }}>{progress}%</span>
        </div>
        <div className="card-body">
          <ProgressBar value={progress} size="lg" showLabel={false} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:'0.78rem', color:'var(--gray-500)' }}>
            <span>{(task.subtasks || []).filter(s=>s.status==='Completed').length} of {(task.subtasks || []).length} subtasks completed</span>
            <span style={{ color:isOverdue?'var(--danger-500)':'var(--gray-500)', fontWeight:isOverdue?700:400 }}>
              {isOverdue ? '⚠ Overdue — ' : 'Due: '}{task.dueDate}
            </span>
          </div>
        </div>
      </div>

      <div className="card-grid">
        {/* Task Info */}
        <div className="card">
          <div className="card-header"><span className="card-title">Task Details</span></div>
          <div className="card-body">
            {task.description && (
              <div className="form-group">
                <div className="info-label">Description</div>
                <div style={{ fontSize:'0.875rem', color:'var(--gray-700)', lineHeight:1.7, marginTop:4, background:'var(--gray-50)', padding:'12px', borderRadius:'var(--radius-md)' }}>
                  {task.description}
                </div>
              </div>
            )}
            <div className="info-grid" style={{ marginTop:16 }}>
              <div className="info-item"><div className="info-label">Project</div><div className="info-value">{task.project || '—'}</div></div>
              <div className="info-item"><div className="info-label">Department</div><div className="info-value">{task.department}</div></div>
              <div className="info-item"><div className="info-label">Start Date</div><div className="info-value">{task.startDate || '—'}</div></div>
              <div className="info-item"><div className="info-label">Due Date</div><div className="info-value" style={{ color:isOverdue?'var(--danger-500)':'inherit', fontWeight:isOverdue?700:400 }}>{task.dueDate}</div></div>
              <div className="info-item"><div className="info-label">Created</div><div className="info-value">{new Date(task.createdAt).toLocaleDateString()}</div></div>
            </div>

            <div style={{ marginTop:16 }}>
              <div className="info-label">Assigned To</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                {assignees.map(u => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar" style={{ background:'var(--teal-500)' }}>{u.name.slice(0,2)}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{u.name}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>{u.role ? u.role.replace('_',' ') : 'IT Staff'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Subtasks */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Subtasks ({(task.subtasks || []).length})</span>
            <span className="id-chip">{(task.subtasks || []).filter(s=>s.status==='Completed').length} done</span>
          </div>
          <div className="card-body" style={{ paddingTop:8 }}>
            {(task.subtasks || []).map(s => {
              const assignee = getUser(s.assignee);
              const canToggle = isAdmin || s.assignee === currentUser.id || isTrainee;
              return (
                <div key={s.id} className="subtask-item" style={{ cursor: canToggle ? 'pointer' : 'default' }} onClick={() => canToggle && handleSubtaskToggle(s)}>
                  <div className={`subtask-check ${s.status==='Completed'?'checked':''}`}>
                    {s.status==='Completed' && <Check size={11} color="white" strokeWidth={3} />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className={`subtask-title ${s.status==='Completed'?'done':''}`}>{s.title}</div>
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                      {assignee && <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}><User size={10} style={{ display:'inline' }} /> {assignee.name}</span>}
                      {s.dueDate && <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}><Calendar size={10} style={{ display:'inline' }} /> {s.dueDate}</span>}
                    </div>
                  </div>
                  <Badge status={s.status} />
                </div>
              );
            })}
            {(task.subtasks || []).length === 0 && (
              <div style={{ textAlign:'center', padding:'24px', color:'var(--gray-400)' }}>No subtasks created yet</div>
            )}
          </div>
        </div>
      </div>

      <HoldReasonModal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        onSubmit={handleHoldSubmit}
        taskTitle={task.title}
      />
    </div>
  );
}

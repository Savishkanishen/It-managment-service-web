import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import HoldReasonModal from '../../components/ui/HoldReasonModal';
import Modal from '../../components/ui/Modal';
import { calcTaskProgress, getUser, ROLES, isTaskAssignedToUser, USERS } from '../../data/mockData';
import { ArrowLeft, CheckSquare, User, Calendar, Flag, Plus, Check, PauseCircle, Lock, UserPlus, Users, UserX, Edit, Trash2 } from 'lucide-react';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks, users, updateTaskStatus, updateSubtaskStatus, assignTask, updateTask, deleteTask } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [remoteTask, setRemoteTask] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const task = tasks.find(t => t.id === id || t.taskNumber === id || t.dbId === id) || remoteTask;

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    startDate: '',
    project: '',
    department: 'IT Department',
  });

  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate || '',
        startDate: task.startDate || '',
        project: task.project || '',
        department: task.department || 'IT Department',
      });
    }
  }, [task]);

  useEffect(() => {
    if (!tasks.some(t => t.id === id || t.taskNumber === id || t.dbId === id)) {
      setLoadingRemote(true);
      fetch(`http://localhost:5000/api/tasks/${id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setRemoteTask(data);
          setLoadingRemote(false);
        })
        .catch(() => setLoadingRemote(false));
    }
  }, [id, tasks]);

  if (loadingRemote && !task) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading task details...</div>;
  }
  if (!task) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Task not found</div>;

  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser?.role) || currentUser?.username?.toLowerCase() === 'admin';
  const isTrainee = currentUser?.role === ROLES.TRAINEE || currentUser?.role?.toLowerCase()?.includes('trainee');
  const canManageTasks = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_OFFICER].includes(currentUser?.role) || isAdmin;
  const isAssignee = isTaskAssignedToUser(task, currentUser);
  const isITStaff = currentUser?.division === 'IT Department' || ['super_admin', 'it_admin', 'it_officer', 'trainee'].includes(currentUser?.role?.toLowerCase());

  const progress = calcTaskProgress(task);
  const assignees = (task.assignees || []).map(id => getUser(id)).filter(Boolean);

  const canEditStatus = canManageTasks || isAssignee || isITStaff;

  const allUsers = users && users.length > 0 ? users : USERS;
  const technicians = allUsers.filter(u => {
    const r = (u.role || u.roleName || '').toLowerCase();
    return r.includes('admin') || r.includes('officer') || r.includes('trainee') || r.includes('intern') || !r;
  });

  const handleSubtaskToggle = (subtask) => {
    const newStatus = subtask.status === 'Completed' ? 'In Progress' : 'Completed';
    updateSubtaskStatus(task.id, subtask.id, newStatus, currentUser);
    addToast('success', 'Subtask Updated', `"${subtask.title}" marked as ${newStatus}`);
  };

  const handleStatusChange = (status) => {
    if (status === 'Cancelled' && !isAdmin) {
      addToast('error', 'Permission Denied', 'Only administrators can cancel tasks.');
      return;
    }
    if (status === 'On Hold' || status === 'Hold' || status === 'Pending') {
      setShowHoldModal(true);
    } else {
      updateTaskStatus(task.id, status, '', currentUser);
      if (status === 'Completed') {
        addToast('success', 'Task Completed', `Task "${task.title}" marked Completed and archived in database.`);
      } else if (status === 'Cancelled') {
        addToast('warning', 'Task Cancelled', `Task "${task.title}" has been cancelled.`);
      } else {
        addToast('success', 'Status Updated', `Task moved to "${status}"`);
      }
    }
  };

  const handleDeleteTask = async () => {
    if (!isAdmin) {
      addToast('error', 'Permission Denied', 'Only administrators can delete tasks.');
      return;
    }
    if (window.confirm(`Permanently delete task "${task.title}" (${task.taskNumber || task.id}) from the database? This cannot be undone.`)) {
      await deleteTask(task.id, currentUser);
      addToast('warning', 'Task Deleted', `Task "${task.title}" has been removed.`);
      navigate('/tasks/list');
    }
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      addToast('error', 'Permission Denied', 'Only administrators can modify tasks.');
      return;
    }
    if (!editForm.title.trim()) {
      addToast('error', 'Validation Error', 'Task title cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      await updateTask(task.id, editForm, currentUser);
      addToast('success', 'Task Updated', 'Task details have been saved in real time.');
      setShowEditModal(false);
    } catch (err) {
      addToast('error', 'Update Failed', err.message || 'Server error modifying task');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleHoldSubmit = (reason) => {
    updateTaskStatus(task.id, 'On Hold', reason, currentUser);
    addToast('warning', 'Task On Hold', `Task placed on hold.`);
    setShowHoldModal(false);
  };

  const handleSaveAssignees = async () => {
    setSavingAssign(true);
    try {
      await assignTask(task.id, selectedAssignees, currentUser);
      addToast('success', 'Assignees Updated', 'Task assignments have been saved to database in real time.');
      setShowAssignModal(false);
    } catch (err) {
      addToast('error', 'Error', 'Failed to update assignees: ' + (err.message || 'Server error'));
    } finally {
      setSavingAssign(false);
    }
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
          <div className="detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowEditModal(true)}
              >
                <Edit size={14} /> Edit Task
              </button>
            )}
            {canManageTasks && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setSelectedAssignees(task.assignees || []);
                  setShowAssignModal(true);
                }}
              >
                <UserPlus size={14} /> Assign Team
              </button>
            )}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)' }}>Change Status:</span>
            <select className="filter-input" value={task.status === 'On Hold' ? 'Pending' : task.status} onChange={e => handleStatusChange(e.target.value)}>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Pending">Pending (On Hold)</option>
              <option value="Completed">Completed</option>
              {isAdmin && <option value="Cancelled">Cancelled (Admin)</option>}
            </select>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--danger-500)', borderColor: '#fca5a5' }}
                onClick={handleDeleteTask}
                title="Delete task permanently"
              >
                <Trash2 size={14} /> Delete Task
              </button>
            )}
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

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="info-label" style={{ marginBottom: 0 }}>Assigned To ({assignees.length})</div>
                {canManageTasks && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: 'var(--teal-600)', padding: '2px 8px' }}
                    onClick={() => {
                      setSelectedAssignees(task.assignees || []);
                      setShowAssignModal(true);
                    }}
                  >
                    <UserPlus size={13} style={{ marginRight: 4 }} />
                    {assignees.length === 0 ? 'Assign Member' : 'Manage Assignees'}
                  </button>
                )}
              </div>

              {assignees.length === 0 ? (
                <div style={{
                  padding: '16px',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px dashed var(--gray-300)',
                  textAlign: 'center',
                  marginTop: 6
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: canManageTasks ? 8 : 0 }}>
                    This task is not assigned to anyone yet.
                  </div>
                  {canManageTasks && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedAssignees(task.assignees || []);
                        setShowAssignModal(true);
                      }}
                    >
                      <UserPlus size={14} style={{ marginRight: 6 }} /> Assign Member Now
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {assignees.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: 'var(--teal-500)' }}>{(u.avatar || u.name.slice(0, 2)).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{u.role ? u.role.replace('_', ' ') : 'IT Staff'}</div>
                        </div>
                      </div>
                      {canManageTasks && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger-500)', fontSize: '0.72rem', padding: '2px 6px' }}
                          title="Remove assignee"
                          onClick={async () => {
                            const updatedList = (task.assignees || []).filter(a => a !== u.id && a !== u.username && a !== u.name);
                            await assignTask(task.id, updatedList, currentUser);
                            addToast('info', 'Assignee Removed', `Removed ${u.name} from task.`);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Team Members — ${task.taskNumber || task.id}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)} disabled={savingAssign}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveAssignees} disabled={savingAssign}>
              <Check size={14} /> {savingAssign ? 'Saving to Database...' : 'Save Assignees'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
          Select technicians to assign to this task. The assignments will save real-time to the database and notify the team members.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {technicians.map(u => {
            const selected = selectedAssignees.includes(u.id) || selectedAssignees.includes(u.username);
            return (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedAssignees(prev =>
                    selected
                      ? prev.filter(a => a !== u.id && a !== u.username)
                      : [...prev, u.id]
                  );
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${selected ? 'var(--teal-500)' : 'var(--border-color)'}`,
                  background: selected ? 'rgba(6, 182, 212, 0.08)' : 'white',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar-sm" style={{ background: selected ? 'var(--teal-500)' : 'var(--gray-400)' }}>
                    {(u.avatar || u.name.slice(0, 2)).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{u.role ? u.role.replace('_', ' ') : 'Staff'} • {u.division || 'IT Department'}</div>
                  </div>
                </div>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? 'var(--teal-500)' : 'var(--gray-300)'}`,
                  background: selected ? 'var(--teal-500)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px'
                }}>
                  {selected && '✓'}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Admin Edit Task Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Modify Task Details — ${task.taskNumber || task.id}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={savingEdit}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>
              <Check size={14} /> {savingEdit ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Task Title <span className="required">*</span></label>
            <input
              className="form-input"
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={editForm.priority}
                onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project</label>
              <input
                className="form-input"
                value={editForm.project}
                onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                placeholder="e.g. Infrastructure Maintenance"
              />
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={editForm.startDate || ''}
                onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={editForm.dueDate || ''}
                onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={4}
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Task instructions and requirements..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

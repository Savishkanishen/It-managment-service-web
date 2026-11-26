import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/ui/DataTable';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import HoldReasonModal from '../../components/ui/HoldReasonModal';
import { calcTaskProgress, getUser, ROLES, isTaskAssignedToUser, USERS } from '../../data/mockData';
import { Search, Plus, Kanban, Calendar, CheckCircle2, Clock, UserCheck, Layers, Check, UserPlus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useNotifications } from '../../context/NotificationContext';

export default function TaskListPage() {
  const { tasks, users, createTask, updateTaskStatus, assignTask } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'mine' | 'completed'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [holdModalTask, setHoldModalTask] = useState(null);
  const [assignModalTask, setAssignModalTask] = useState(null);
  const [assignModalAssignees, setAssignModalAssignees] = useState([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    startDate: '',
    dueDate: '',
    assignees: [],
    project: ''
  });

  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser?.role) || currentUser?.username?.toLowerCase() === 'admin';

  // Base tasks for current user role: non-admins strictly see only tasks assigned to them
  const baseTasks = !isAdmin
    ? tasks.filter(t => isTaskAssignedToUser(t, currentUser))
    : tasks;

  // Filter tasks according to active tab
  const tabFilteredTasks = baseTasks.filter(t => {
    if (activeTab === 'active') {
      return t.status !== 'Completed' && t.status !== 'Cancelled';
    }
    if (activeTab === 'mine') {
      return isTaskAssignedToUser(t, currentUser);
    }
    if (activeTab === 'completed') {
      return t.status === 'Completed' || t.status === 'Cancelled';
    }
    return true; // 'all'
  });

  const filtered = tabFilteredTasks.filter(t => {
    const matchSearch = !search || [t.id, t.taskNumber, t.title, t.project].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All'
      ? true
      : statusFilter === 'Pending'
        ? (t.status === 'Pending' || t.status === 'On Hold' || t.status === 'Hold')
        : t.status === statusFilter;
    const matchPri = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPri;
  });

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

  const handleCreate = async () => {
    if (!form.title.trim()) {
      addToast('error', 'Required Field', 'Please provide a task title');
      return;
    }

    const defaultDueDate = form.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const defaultStartDate = form.startDate || new Date().toISOString().split('T')[0];

    setIsSubmitting(true);
    try {
      await createTask({
        ...form,
        title: form.title.trim(),
        startDate: defaultStartDate,
        dueDate: defaultDueDate,
        createdBy: currentUser?.id,
        department: 'IT Department',
      }, currentUser);

      addToast('success', 'Task Created', `Task "${form.title}" has been saved and synchronized in real time.`);
      setShowNew(false);
      setForm({ title: '', description: '', priority: 'Medium', status: 'To Do', startDate: '', dueDate: '', assignees: [], project: '' });
    } catch (err) {
      console.error('Error creating task:', err);
      addToast('error', 'Creation Error', 'Could not create task: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = (task) => {
    setAssignModalTask(task);
    setAssignModalAssignees(task.assignees || []);
  };

  const handleSaveAssignment = async () => {
    if (!assignModalTask) return;
    setIsSavingAssign(true);
    try {
      await assignTask(assignModalTask.id, assignModalAssignees, currentUser);
      addToast('success', 'Task Assigned', `Assignees for "${assignModalTask.title}" updated in database.`);
      setAssignModalTask(null);
    } catch (err) {
      addToast('error', 'Assignment Error', 'Failed to update assignees: ' + (err.message || 'Server error'));
    } finally {
      setIsSavingAssign(false);
    }
  };

  const toggleAssignee = (id) => {
    setForm(f => ({
      ...f,
      assignees: f.assignees.includes(id) ? f.assignees.filter(a => a !== id) : [...f.assignees, id]
    }));
  };

  const allUsers = users && users.length > 0 ? users : USERS;
  const technicians = allUsers.filter(u => {
    const r = (u.role || u.roleName || '').toLowerCase();
    return r.includes('admin') || r.includes('officer') || r.includes('trainee') || r.includes('intern') || !r;
  });

  const columns = [
    {
      key: 'id',
      label: 'Task ID',
      render: (v, row) => (
        <Link
          to={`/tasks/${row.taskNumber || v}`}
          style={{ fontFamily: 'JetBrains Mono,monospace', color: 'var(--teal-600)', fontWeight: 600, fontSize: '0.8rem' }}
        >
          {row.taskNumber || v}
        </Link>
      )
    },
    {
      key: 'title',
      label: 'Task',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{v}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{row.project || 'General'}</div>
          {(row.status === 'On Hold' || row.status === 'Hold') && row.holdReason && (
            <div style={{ fontSize: '0.7rem', color: '#c2410c', marginTop: 3 }}>Reason: {row.holdReason}</div>
          )}
          <div style={{ marginTop: 6 }}><ProgressBar value={calcTaskProgress(row)} size="sm" showLabel={false} /></div>
        </div>
      )
    },
    { key: 'priority', label: 'Priority', render: v => <PriorityBadge priority={v} /> },
    {
      key: 'status',
      label: 'Status',
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select
            className="filter-input"
            style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
            value={row.status === 'On Hold' ? 'Pending' : row.status}
            onChange={(e) => handleStatusChange(row, e.target.value)}
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Pending">Pending (On Hold)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      )
    },
    {
      key: 'assignees',
      label: 'Assignees',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="avatar-stack">
            {(v || []).slice(0, 3).map(id => {
              const u = getUser(id);
              return u ? (
                <div
                  key={id}
                  className="avatar avatar-sm"
                  style={{ background: 'var(--teal-500)' }}
                  title={`${u.name} (${u.role || 'Staff'})`}
                >
                  {(u.avatar || u.name.slice(0, 2)).toUpperCase()}
                </div>
              ) : null;
            })}
            {(v || []).length > 3 && (
              <div className="avatar avatar-sm" style={{ background: 'var(--gray-400)' }}>
                +{(v || []).length - 3}
              </div>
            )}
            {(!v || v.length === 0) && (
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>Unassigned</span>
            )}
          </div>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{
                padding: '2px 8px',
                fontSize: '0.72rem',
                height: 'auto',
                color: (!v || v.length === 0) ? 'var(--teal-700)' : 'var(--gray-600)',
                background: (!v || v.length === 0) ? 'rgba(6, 182, 212, 0.12)' : 'var(--gray-100)',
                border: `1px solid ${(!v || v.length === 0) ? 'var(--teal-400)' : 'var(--gray-200)'}`,
                borderRadius: 'var(--radius-sm)',
                fontWeight: (!v || v.length === 0) ? 700 : 500,
                cursor: 'pointer'
              }}
              title="Assign or reassign team members"
              onClick={(e) => {
                e.stopPropagation();
                openAssignModal(row);
              }}
            >
              <UserPlus size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              {(!v || v.length === 0) ? 'Assign' : 'Edit'}
            </button>
          )}
        </div>
      )
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (v, row) => {
        const overdue = v && new Date(v) < new Date() && row.status !== 'Completed';
        return (
          <span style={{ fontSize: '0.8rem', color: overdue ? 'var(--danger-500)' : 'var(--gray-600)', fontWeight: overdue ? 700 : 400 }}>
            {overdue ? '⚠ ' : ''}{v || '—'}
          </span>
        );
      }
    },
    {
      key: 'id',
      label: '',
      sortable: false,
      render: (v, row) => (
        <Link to={`/tasks/${row.taskNumber || v}`} className="btn btn-secondary btn-sm">
          View
        </Link>
      )
    },
  ];

  // Tab counts
  const countAll = baseTasks.length;
  const countActive = baseTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const countMine = tasks.filter(t => isTaskAssignedToUser(t, currentUser)).length;
  const countCompleted = baseTasks.filter(t => t.status === 'Completed' || t.status === 'Cancelled').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Task List</h1>
          <p>
            {isAdmin
              ? 'All IT Department tasks sorted, filtered, and synchronized real-time with PostgreSQL database'
              : 'Your assigned IT Department tasks sorted, filtered, and synchronized real-time'}
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/tasks/board" className="btn btn-secondary btn-sm"><Kanban size={14} /> Board</Link>
          <Link to="/tasks/calendar" className="btn btn-secondary btn-sm"><Calendar size={14} /> Calendar</Link>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'all' ? '1px solid var(--teal-500)' : '1px solid transparent',
            background: activeTab === 'all' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: activeTab === 'all' ? 'var(--teal-700)' : 'var(--gray-600)',
            fontWeight: activeTab === 'all' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Layers size={15} />
          {isAdmin ? 'All Department Tasks' : 'My Assigned Tasks'}
          <span style={{
            background: activeTab === 'all' ? 'var(--teal-500)' : 'var(--gray-200)',
            color: activeTab === 'all' ? 'white' : 'var(--gray-600)',
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px'
          }}>
            {countAll}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'active' ? '1px solid var(--teal-500)' : '1px solid transparent',
            background: activeTab === 'active' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: activeTab === 'active' ? 'var(--teal-700)' : 'var(--gray-600)',
            fontWeight: activeTab === 'active' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Clock size={15} />
          Active Tasks
          <span style={{
            background: activeTab === 'active' ? 'var(--teal-500)' : 'var(--gray-200)',
            color: activeTab === 'active' ? 'white' : 'var(--gray-600)',
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px'
          }}>
            {countActive}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'mine' ? '1px solid var(--teal-500)' : '1px solid transparent',
            background: activeTab === 'mine' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: activeTab === 'mine' ? 'var(--teal-700)' : 'var(--gray-600)',
            fontWeight: activeTab === 'mine' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <UserCheck size={15} />
          Assigned to Me
          <span style={{
            background: activeTab === 'mine' ? 'var(--teal-500)' : 'var(--gray-200)',
            color: activeTab === 'mine' ? 'white' : 'var(--gray-600)',
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px'
          }}>
            {countMine}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'completed' ? '1px solid var(--teal-500)' : '1px solid transparent',
            background: activeTab === 'completed' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            color: activeTab === 'completed' ? 'var(--teal-700)' : 'var(--gray-600)',
            fontWeight: activeTab === 'completed' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <CheckCircle2 size={15} />
          Completed Archive
          <span style={{
            background: activeTab === 'completed' ? 'var(--teal-500)' : 'var(--gray-200)',
            color: activeTab === 'completed' ? 'white' : 'var(--gray-600)',
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px'
          }}>
            {countCompleted}
          </span>
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} color="var(--gray-400)" />
            <input
              className="filter-input"
              placeholder="Search task ID, title, project..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
          </div>
          <div className="table-filters">
            <select className="filter-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Pending">Pending / On Hold</option>
              <option value="Completed">✓ Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select className="filter-input" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="All">All Priorities</option>
              <option>Urgent</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage={
            activeTab === 'mine'
              ? 'No tasks assigned to you currently'
              : activeTab === 'completed'
                ? 'No completed tasks archived yet'
                : 'No tasks found'
          }
          emptyIcon="📋"
        />
      </div>

      {/* New Task Adder Modal */}
      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="Create New Task"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={isSubmitting}>
              <Plus size={14} /> {isSubmitting ? 'Saving to Database...' : 'Create Task'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Task Title <span className="required">*</span></label>
            <input
              className="form-input"
              placeholder="Enter task title (e.g. Server Maintenance, Fiber Cable Termination)..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Initial Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Ongoing">Ongoing</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project / Group</label>
            <input
              className="form-input"
              placeholder="e.g. Network Upgrade 2026, Asset Management"
              value={form.project}
              onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            placeholder="Detailed description of task objectives, requirements, and steps..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2, display: 'block' }}>
              Defaults to 7 days from now if omitted
            </span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Assign To Team Members</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {technicians.map(u => {
              const selected = form.assignees.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: selected ? 'var(--teal-500)' : 'var(--gray-100)',
                    color: selected ? 'white' : 'var(--gray-700)',
                    border: `1.5px solid ${selected ? 'var(--teal-500)' : 'var(--gray-200)'}`,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {selected ? '✓ ' : '+ '}{u.name} {u.role ? `(${u.role})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      <HoldReasonModal
        isOpen={!!holdModalTask}
        onClose={() => setHoldModalTask(null)}
        onSubmit={handleHoldSubmit}
        taskTitle={holdModalTask?.title || ''}
      />

      {/* Quick Task Assign Modal for Admins */}
      <Modal
        isOpen={!!assignModalTask}
        onClose={() => setAssignModalTask(null)}
        title={`Assign Task — ${assignModalTask?.taskNumber || assignModalTask?.id}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAssignModalTask(null)} disabled={isSavingAssign}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveAssignment} disabled={isSavingAssign}>
              <Check size={14} /> {isSavingAssign ? 'Saving to Database...' : 'Save Assignees'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 14 }}>
          Assign or reassign team members to: <strong>{assignModalTask?.title}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {technicians.map(u => {
            const selected = assignModalAssignees.includes(u.id) || assignModalAssignees.includes(u.username);
            return (
              <div
                key={u.id}
                onClick={() => {
                  setAssignModalAssignees(prev =>
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
    </div>
  );
}

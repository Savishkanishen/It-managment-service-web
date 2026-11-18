import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import HoldReasonModal from '../../components/ui/HoldReasonModal';
import { calcTaskProgress, getUser, ROLES, isTaskAssignedToUser } from '../../data/mockData';
import { Kanban, Calendar, Clock, Lock } from 'lucide-react';

const COLUMNS = [
  { id: 'To Do', label: 'To Do', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'Ongoing', label: 'Ongoing', color: '#06b6d4', bg: '#ecfeff' },
  { id: 'On Hold', label: 'On Hold', color: '#f97316', bg: '#fff7ed' },
  { id: 'Completed', label: 'Completed', color: '#10b981', bg: '#ecfdf5' },
];

export default function TaskBoardPage() {
  const { tasks, updateTaskStatus } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [pendingDragTask, setPendingDragTask] = useState(null);

  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser.role);
  const visibleTasks = isAdmin ? tasks : tasks.filter(t => isTaskAssignedToUser(t, currentUser));

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = visibleTasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newStatus = destination.droppableId;
    const targetTask = tasks.find(t => t.id === draggableId);

    if (newStatus === 'On Hold' || newStatus === 'Hold') {
      setPendingDragTask({ task: targetTask, newStatus });
    } else {
      updateTaskStatus(draggableId, newStatus, '', currentUser);
      addToast('success', 'Status Updated', `Task moved to "${newStatus}"`);
    }
  };

  const handleHoldSubmit = (reason) => {
    if (!pendingDragTask) return;
    updateTaskStatus(pendingDragTask.task.id, 'On Hold', reason, currentUser);
    addToast('warning', 'Task On Hold', `Task "${pendingDragTask.task.title}" placed on hold.`);
    setPendingDragTask(null);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kanban Board</h1>
          <p>Drag and drop tasks to update their status (To Do, In Progress, Ongoing, On Hold, Completed)</p>
        </div>
        <div className="page-header-actions">
          <Link to="/tasks/list" className="btn btn-secondary btn-sm">List View</Link>
          <Link to="/tasks/calendar" className="btn btn-secondary btn-sm"><Calendar size={14} /> Calendar</Link>
        </div>
      </div>

      {!isAdmin && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.82rem',
          color: 'var(--teal-700)'
        }}>
          <Lock size={15} color="var(--teal-600)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Private Board:</strong> Displaying only tasks assigned directly to you. Other members' assigned works are private.
          </span>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-column">
              <div className="kanban-col-header" style={{ borderBottomColor: col.color, background: col.bg }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                {col.label}
                <span className="kanban-col-count" style={{ background: col.color, color: 'white' }}>{grouped[col.id]?.length || 0}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    className="kanban-col-body"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ background: snapshot.isDraggingOver ? col.bg : undefined, minHeight: 80 }}
                  >
                    {grouped[col.id]?.map((task, index) => {
                      const progress = calcTaskProgress(task);
                      const assignees = (task.assignees || []).map(id => getUser(id)).filter(Boolean);
                      const dueDate = new Date(task.dueDate);
                      const isOverdue = dueDate < new Date() && task.status !== 'Completed';
                      const isOnHold = task.status === 'On Hold' || task.status === 'Hold';
                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                <div className="kanban-card-id">{task.id}</div>
                                <Badge status={task.status} />
                              </div>
                              <div className="kanban-card-title">{task.title}</div>

                              {isOnHold && task.holdReason && (
                                <div style={{ fontSize: '0.7rem', color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', padding: '4px 8px', borderRadius: 4, marginTop: 4, marginBottom: 6 }}>
                                  <strong>Hold Reason:</strong> {task.holdReason}
                                </div>
                              )}

                              <div className="kanban-card-progress">
                                <ProgressBar value={progress} size="sm" showLabel={false} />
                                <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 4 }}>{progress}% complete</div>
                              </div>

                              <div className="kanban-card-meta">
                                <PriorityBadge priority={task.priority} />
                                {isOverdue && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>Overdue</span>}
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={11} color="var(--gray-400)" />
                                  <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>{task.dueDate}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                <div className="avatar-stack">
                                  {assignees.slice(0,3).map(u => (
                                    <div key={u.id} className="avatar avatar-sm" style={{ background: 'var(--teal-500)' }} title={u.name}>
                                      {u.name.slice(0,2)}
                                    </div>
                                  ))}
                                </div>
                                <Link to={`/tasks/${task.id}`} style={{ fontSize: '0.72rem', color: 'var(--teal-600)', fontWeight: 600 }}>View →</Link>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {grouped[col.id]?.length === 0 && !snapshot.isDraggingOver && (
                      <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--gray-300)', fontSize: '0.8rem' }}>
                        Drop tasks here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <HoldReasonModal
        isOpen={!!pendingDragTask}
        onClose={() => setPendingDragTask(null)}
        onSubmit={handleHoldSubmit}
        taskTitle={pendingDragTask?.task?.title || ''}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import { calcTaskProgress, ROLES, isTaskAssignedToUser } from '../../data/mockData';
import { CalendarDays, Layers, UserCheck } from 'lucide-react';

export default function TaskCalendarPage() {
  const { tasks } = useData();
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser?.role) || currentUser?.username?.toLowerCase() === 'admin';
  const [filterMode, setFilterMode] = useState(isAdmin ? 'all' : 'mine'); // 'all' | 'mine'

  const myTasksCount = tasks.filter(t => isTaskAssignedToUser(t, currentUser)).length;
  // Non-admins strictly only see their assigned task deadlines; admins can view all or mine
  const visibleTasks = (!isAdmin || filterMode === 'mine')
    ? tasks.filter(t => isTaskAssignedToUser(t, currentUser))
    : tasks;

  // Timezone-safe YYYY-MM-DD date key generators
  const getTaskDateKey = (rawDate) => {
    if (!rawDate) return null;
    if (typeof rawDate === 'string') {
      const match = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
      }
    }
    const dt = new Date(rawDate);
    if (isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const getCalDateKey = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  };

  const tasksOnDate = (date) => {
    const calKey = getCalDateKey(date);
    return visibleTasks.filter(t => getTaskDateKey(t.dueDate) === calKey);
  };

  const todayTasks = visibleTasks.filter(t => getTaskDateKey(t.dueDate) === getCalDateKey(selectedDate));

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dayTasks = tasksOnDate(date);
    if (dayTasks.length === 0) return null;
    return (
      <div
        className="calendar-dots"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          justifyContent: 'center',
          marginTop: 3,
          minHeight: 8,
          position: 'relative',
          zIndex: 2
        }}
      >
        {dayTasks.slice(0, 4).map((t, i) => {
          const color = t.priority === 'Urgent' || t.priority === 'High'
            ? '#ef4444'
            : t.priority === 'Medium'
              ? '#f59e0b'
              : '#10b981';
          return (
            <span
              key={t.id || i}
              title={`${t.taskNumber || t.id}: ${t.title} (${t.status})`}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
                boxShadow: '0 0 1px rgba(0,0,0,0.4)'
              }}
            />
          );
        })}
        {dayTasks.length > 4 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--gray-500)', fontWeight: 700, lineHeight: 1 }}>+</span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Task Calendar</h1>
          <p>Deadline & milestone calendar view synchronized real time</p>
        </div>
        <div className="page-header-actions">
          {isAdmin ? (
            <div style={{ display: 'flex', gap: 6, background: 'var(--gray-100)', padding: 3, borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  border: 'none',
                  background: filterMode === 'all' ? 'white' : 'transparent',
                  fontWeight: filterMode === 'all' ? 700 : 500,
                  color: filterMode === 'all' ? 'var(--teal-700)' : 'var(--gray-600)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: filterMode === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <Layers size={13} /> All Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('mine')}
                style={{
                  border: 'none',
                  background: filterMode === 'mine' ? 'white' : 'transparent',
                  fontWeight: filterMode === 'mine' ? 700 : 500,
                  color: filterMode === 'mine' ? 'var(--teal-700)' : 'var(--gray-600)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: filterMode === 'mine' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <UserCheck size={13} /> My Deadlines ({myTasksCount})
              </button>
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid var(--teal-300)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--teal-800)',
              fontWeight: 600
            }}>
              <UserCheck size={13} style={{ color: 'var(--teal-600)' }} />
              <span>My Deadlines ({myTasksCount})</span>
            </div>
          )}
          <Link to="/tasks/list" className="btn btn-secondary btn-sm">List View</Link>
          <Link to="/tasks/board" className="btn btn-secondary btn-sm">Board</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div>
          <div className="card" style={{ padding: 16 }}>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
            />

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.78rem', color: 'var(--gray-500)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Urgent / High
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Medium
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Low
              </div>
              <span style={{ marginLeft: 'auto', fontStyle: 'italic', color: 'var(--gray-400)' }}>
                Colored dots indicate tasks due on that date
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <CalendarDays size={16} style={{ display: 'inline', marginRight: 8 }} />
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="id-chip">{todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              {todayTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--gray-400)' }}>
                  <CalendarDays size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div>No tasks due on this date</div>
                </div>
              ) : todayTasks.map(t => {
                const priorityColor = t.priority === 'Urgent' || t.priority === 'High'
                  ? 'var(--danger-500)'
                  : t.priority === 'Medium'
                    ? 'var(--warning-500)'
                    : 'var(--success-500)';
                return (
                  <div key={t.id} style={{ borderLeft: `3px solid ${priorityColor}`, paddingLeft: 12, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)', marginBottom: 4 }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <PriorityBadge priority={t.priority} />
                      <Badge status={t.status} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 6 }}>{t.project || 'General'}</div>
                    <Link to={`/tasks/${t.taskNumber || t.id}`} style={{ fontSize: '0.75rem', color: 'var(--teal-600)', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
                      View task →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming tasks */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><span className="card-title">Upcoming Deadlines</span></div>
            <div className="card-body" style={{ paddingTop: 8, maxHeight: 300, overflowY: 'auto' }}>
              {visibleTasks
                .filter(t => t.status !== 'Completed' && t.dueDate)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .slice(0, 10)
                .map(t => {
                  const due = new Date(t.dueDate);
                  const overdue = due < new Date();
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: overdue ? 'var(--danger-50)' : 'var(--gray-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>{due.toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: overdue ? 'var(--danger-500)' : 'var(--gray-800)' }}>{due.getDate()}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/tasks/${t.taskNumber || t.id}`} style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray-900)' }}>{t.title}</Link>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                          <PriorityBadge priority={t.priority} />
                          {overdue && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>Overdue</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

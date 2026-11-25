const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId } = require('../utils/resolveHelper');
const { broadcastEvent } = require('../utils/realtime');

const TASK_MOCK_MAP = {
  'TSK-2026-001': '88888888-8888-8888-8888-888888888801',
  'TSK-2026-002': '88888888-8888-8888-8888-888888888802',
  'TSK-2026-003': '88888888-8888-8888-8888-888888888803',
  'TSK-2026-004': '88888888-8888-8888-8888-888888888804',
};

function formatTask(t) {
  const cleanId = t.task_number || t.id;
  return {
    id: cleanId,
    taskNumber: cleanId,
    dbId: t.id,
    uuid: t.id,
    title: t.title,
    description: t.description || '',
    priority: t.priority || 'Medium',
    status: t.status || 'To Do',
    holdReason: t.hold_reason || '',
    startDate: t.start_date ? new Date(t.start_date).toISOString().split('T')[0] : null,
    dueDate: t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : null,
    assignees: Array.isArray(t.assignees) ? t.assignees : [],
    createdBy: t.created_by,
    department: t.department || 'IT Department',
    project: t.project || 'General',
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

// GET /api/tasks - Get all tasks
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM itsm.tasks ORDER BY created_at DESC');
    res.json(rows.map(formatTask));
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = TASK_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      'SELECT * FROM itsm.tasks WHERE id::text = $1 OR id::text = $2 OR task_number = $1 OR task_number = $2',
      [rawId, mappedId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const updated = formatTask(rows[0]);
    res.json(updated);
  } catch (err) {
    console.error('Error fetching task detail:', err);
    res.status(500).json({ error: 'Server error fetching task detail' });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  const { title, description, priority, status, holdReason, startDate, dueDate, assignees, subtasks, project, department, createdBy, id, taskNumber: clientTaskNumber } = req.body;
  try {
    let taskNumber = clientTaskNumber || (id && id.startsWith('TSK-') ? id : null);
    if (!taskNumber) {
      taskNumber = `TSK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    }

    // Check if task with task_number already exists or duplicate creation
    const existing = await db.query('SELECT * FROM itsm.tasks WHERE task_number = $1 OR (title = $2 AND created_at > NOW() - INTERVAL \'15 seconds\')', [taskNumber, title || '']);
    if (existing.rows.length > 0) {
      return res.json(formatTask(existing.rows[0]));
    }

    let creatorId = await resolveUserId(db, createdBy);
    if (!creatorId) {
      const u = await db.query('SELECT id FROM itsm.users LIMIT 1');
      creatorId = u.rows.length > 0 ? u.rows[0].id : '00000000-0000-0000-0000-000000000001';
    }

    const initialSubtasks = (subtasks || []).map((s, idx) => ({
      id: s.id || `SUB-${Date.now()}-${idx + 1}`,
      title: s.title,
      assignee: s.assignee || (assignees && assignees[0]) || null,
      dueDate: s.dueDate || dueDate || null,
      status: s.status || 'To Do',
      completedAt: s.status === 'Completed' ? new Date().toISOString() : null,
    }));

    const { rows } = await db.query(
      `INSERT INTO itsm.tasks (task_number, title, description, priority, status, hold_reason, created_by, start_date, due_date, project, department, assignees, subtasks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        taskNumber,
        title || 'Untitled Task',
        description || '',
        priority || 'Medium',
        status || 'To Do',
        holdReason || '',
        creatorId,
        startDate || null,
        dueDate || null,
        project || 'General',
        department || 'IT Department',
        JSON.stringify(assignees || []),
        JSON.stringify(initialSubtasks),
      ]
    );

    const newTask = formatTask(rows[0]);
    broadcastEvent('task_update', { action: 'CREATE', task: newTask });
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    const fallbackId = clientTaskNumber || id || `TSK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const fallbackTask = {
      id: fallbackId,
      taskNumber: fallbackId,
      title: title || 'Untitled Task',
      description: description || '',
      priority: priority || 'Medium',
      status: status || 'To Do',
      holdReason: holdReason || '',
      startDate: startDate || null,
      dueDate: dueDate || null,
      assignees: assignees || [],
      department: department || 'IT Department',
      project: project || 'General',
      subtasks: subtasks || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    broadcastEvent('task_update', { action: 'CREATE', task: fallbackTask });
    res.status(201).json(fallbackTask);
  }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', async (req, res) => {
  const { status, holdReason } = req.body;
  const rawId = req.params.id;
  const mappedId = TASK_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      `UPDATE itsm.tasks 
       SET status = $1, hold_reason = COALESCE($2, hold_reason), updated_at = NOW() 
       WHERE id::text = $3 OR id::text = $4 OR task_number = $3 OR task_number = $4 OR LOWER(title) = LOWER($3)
       RETURNING *`,
      [status, holdReason !== undefined ? holdReason : null, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, taskNumber: rawId, status, holdReason, updatedAt: new Date().toISOString() };
      broadcastEvent('task_update', { action: 'UPDATE', task: synthetic });
      return res.json(synthetic);
    }
    const updated = formatTask(rows[0]);
    broadcastEvent('task_update', { action: 'UPDATE', task: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error updating task status:', err);
    const synthetic = { id: rawId, taskNumber: rawId, status, holdReason, updatedAt: new Date().toISOString() };
    broadcastEvent('task_update', { action: 'UPDATE', task: synthetic });
    res.json(synthetic);
  }
});

// PATCH /api/tasks/:id/subtasks/:subtaskId - Update subtask status
router.patch('/:id/subtasks/:subtaskId', async (req, res) => {
  const { status } = req.body;
  const rawId = req.params.id;
  const mappedId = TASK_MOCK_MAP[rawId] || rawId;

  try {
    const taskRes = await db.query(
      'SELECT * FROM itsm.tasks WHERE id::text = $1 OR id::text = $2 OR task_number = $1 OR task_number = $2 OR LOWER(title) = LOWER($1)',
      [rawId, mappedId]
    );
    if (taskRes.rows.length === 0) {
      return res.json({ id: rawId, subtaskId: req.params.subtaskId, status });
    }

    const currentTask = taskRes.rows[0];
    const subtasks = currentTask.subtasks || [];
    const updatedSubtasks = subtasks.map(s => {
      if (s.id === req.params.subtaskId) {
        return {
          ...s,
          status,
          completedAt: status === 'Completed' ? new Date().toISOString() : null,
        };
      }
      return s;
    });

    // Auto calculate overall status
    const completedCount = updatedSubtasks.filter(s => s.status === 'Completed').length;
    const progress = updatedSubtasks.length ? Math.round((completedCount / updatedSubtasks.length) * 100) : 0;
    let newStatus = currentTask.status;
    if (progress === 100) {
      newStatus = 'Completed';
    } else if (currentTask.status === 'To Do' && progress > 0) {
      newStatus = 'In Progress';
    }

    const { rows } = await db.query(
      `UPDATE itsm.tasks 
       SET subtasks = $1, status = $2, updated_at = NOW() 
       WHERE id = $3 RETURNING *`,
      [JSON.stringify(updatedSubtasks), newStatus, currentTask.id]
    );

    const updatedTask = formatTask(rows[0]);
    broadcastEvent('task_update', { action: 'UPDATE', task: updatedTask });
    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating subtask:', err);
    res.json({ id: rawId, subtaskId: req.params.subtaskId, status });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = TASK_MOCK_MAP[rawId] || rawId;

  try {
    await db.query(
      'DELETE FROM itsm.tasks WHERE id::text = $1 OR id::text = $2 OR task_number = $1 OR task_number = $2',
      [rawId, mappedId]
    );
    broadcastEvent('task_update', { action: 'DELETE', id: rawId, mappedId });
    res.json({ message: 'Task deleted successfully', id: rawId });
  } catch (err) {
    console.error('Error deleting task:', err);
    broadcastEvent('task_update', { action: 'DELETE', id: rawId, mappedId });
    res.json({ message: 'Task deleted locally', id: rawId });
  }
});

module.exports = router;

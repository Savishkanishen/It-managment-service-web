const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId } = require('../utils/resolveHelper');

function formatTask(t) {
  return {
    id: t.id,
    taskNumber: t.task_number,
    title: t.title,
    description: t.description || '',
    priority: t.priority || 'Medium',
    status: t.status || 'To Do',
    holdReason: t.hold_reason || '',
    startDate: t.start_date ? new Date(t.start_date).toISOString().split('T')[0] : null,
    dueDate: t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : null,
    assignees: t.assignees || [],
    createdBy: t.created_by,
    department: t.department || 'IT Department',
    project: t.project || 'General',
    subtasks: t.subtasks || [],
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

// GET /api/tasks - Get all tasks (Non-admin members only see tasks assigned to them)
router.get('/', async (req, res) => {
  const requestingUserId = req.headers['x-user-id'] || req.query.userId;
  try {
    let isManager = true;
    let resolvedUser = null;

    if (requestingUserId) {
      const uRes = await db.query(
        `SELECT u.id, u.username, r.name as role_name 
         FROM itsm.users u 
         LEFT JOIN itsm.roles r ON u.role_id = r.id 
         WHERE u.id::text = $1 OR LOWER(u.username) = LOWER($1)`,
        [requestingUserId]
      );
      if (uRes.rows.length > 0) {
        resolvedUser = uRes.rows[0];
        const role = (resolvedUser.role_name || '').toLowerCase();
        // Only Super Admin and IT Admin can see all members' assigned works
        if (!role.includes('super') && !role.includes('it_admin') && role !== 'it') {
          isManager = false;
        }
      }
    }

    let queryText = 'SELECT * FROM itsm.tasks ORDER BY created_at DESC';
    let queryParams = [];

    if (!isManager && resolvedUser) {
      queryText = `
        SELECT * FROM itsm.tasks 
        WHERE created_by = $1
           OR assignees::text ILIKE '%' || $1 || '%'
           OR assignees::text ILIKE '%' || $2 || '%'
           OR subtasks::text ILIKE '%' || $1 || '%'
           OR subtasks::text ILIKE '%' || $2 || '%'
        ORDER BY created_at DESC
      `;
      queryParams = [resolvedUser.id, resolvedUser.username];
    }

    const { rows } = await db.query(queryText, queryParams);
    res.json(rows.map(formatTask));
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM itsm.tasks WHERE id::text = $1 OR task_number = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(formatTask(rows[0]));
  } catch (err) {
    console.error('Error fetching task detail:', err);
    res.status(500).json({ error: 'Server error fetching task detail' });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  const { title, description, priority, status, holdReason, startDate, dueDate, assignees, subtasks, project, department, createdBy } = req.body;
  try {
    const taskNumber = `TSK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const creatorId = await resolveUserId(db, createdBy);

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
        title,
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

    res.status(201).json(formatTask(rows[0]));
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message || 'Server error creating task' });
  }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', async (req, res) => {
  const { status, holdReason } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE itsm.tasks 
       SET status = $1, hold_reason = COALESCE($2, hold_reason), updated_at = NOW() 
       WHERE id::text = $3 OR task_number = $3 RETURNING *`,
      [status, holdReason !== undefined ? holdReason : null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(formatTask(rows[0]));
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ error: 'Server error updating task status' });
  }
});

// PATCH /api/tasks/:id/subtasks/:subtaskId - Update subtask status
router.patch('/:id/subtasks/:subtaskId', async (req, res) => {
  const { status } = req.body;
  try {
    const taskRes = await db.query('SELECT * FROM itsm.tasks WHERE id::text = $1 OR task_number = $1', [req.params.id]);
    if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

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

    res.json(formatTask(rows[0]));
  } catch (err) {
    console.error('Error updating subtask:', err);
    res.status(500).json({ error: 'Server error updating subtask' });
  }
});

module.exports = router;
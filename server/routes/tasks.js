const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../db');

// Get tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const [member] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const tasks = await query(`
      SELECT t.*, u.name as assigned_name, cb.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cb ON cb.id = t.created_by
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `, [req.params.projectId]);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, due_date, priority, project_id, assigned_to } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: 'Title and project required' });

    const [me] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [project_id, req.user.id]
    );
    if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const assignedId = assigned_to ? parseInt(assigned_to) || null : null;

    const result = await query(
      'INSERT INTO tasks (title, description, due_date, priority, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', due_date || null, priority || 'medium', project_id, assignedId, req.user.id]
    );

    const [task] = await query(`
      SELECT t.*, u.name as assigned_name, cb.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cb ON cb.id = t.created_by
      WHERE t.id = ?
    `, [result.insertId]);

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const [task] = await query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const [me] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, req.user.id]
    );
    if (!me) return res.status(403).json({ error: 'Not a member' });

    const { title, description, due_date, priority, status, assigned_to } = req.body;

    if (me.role === 'member') {
      // Members can only update status of tasks assigned to them
      if (task.assigned_to !== req.user.id) return res.status(403).json({ error: 'Not assigned to you' });
      const newStatus = status || task.status;
      await query('UPDATE tasks SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    } else {
      // Admin: update all fields with safe fallbacks
      const newTitle = title || task.title;
      const newDesc = description !== undefined ? description : task.description;
      const newPriority = priority || task.priority;
      const newStatus = status || task.status;

      // Safe due_date handling
      let newDueDate = task.due_date;
      if (due_date !== undefined) {
        newDueDate = (due_date === '' || due_date === null) ? null : due_date;
      }

      // Safe assigned_to handling — always parse to int or null
      let newAssignedTo = task.assigned_to;
      if (assigned_to !== undefined) {
        if (assigned_to === null || assigned_to === '' || assigned_to === 'null' || assigned_to === 0) {
          newAssignedTo = null;
        } else {
          const parsed = parseInt(assigned_to);
          newAssignedTo = isNaN(parsed) ? task.assigned_to : parsed;
        }
      }

      await query(
        'UPDATE tasks SET title=?, description=?, due_date=?, priority=?, status=?, assigned_to=? WHERE id=?',
        [newTitle, newDesc, newDueDate, newPriority, newStatus, newAssignedTo, req.params.id]
      );
    }

    const [updated] = await query(`
      SELECT t.*, u.name as assigned_name, cb.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cb ON cb.id = t.created_by
      WHERE t.id = ?
    `, [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const [task] = await query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const [me] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, req.user.id]
    );
    if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Dashboard stats
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const projectIds = await query(
      'SELECT project_id FROM project_members WHERE user_id = ?',
      [req.user.id]
    );
    if (!projectIds.length) return res.json({ total: 0, todo: 0, inprogress: 0, done: 0, overdue: 0, byUser: [] });

    const ids = projectIds.map(p => p.project_id);
    const placeholders = ids.map(() => '?').join(',');

    const [totals] = await query(`
      SELECT
        COUNT(*) as total,
        SUM(status='todo') as todo,
        SUM(status='inprogress') as inprogress,
        SUM(status='done') as done,
        SUM(due_date < CURDATE() AND status != 'done') as overdue
      FROM tasks WHERE project_id IN (${placeholders})
    `, ids);

    const byUser = await query(`
      SELECT u.name, COUNT(t.id) as count FROM tasks t
      JOIN users u ON u.id = t.assigned_to
      WHERE t.project_id IN (${placeholders})
      GROUP BY t.assigned_to, u.name
    `, ids);

    res.json({ ...totals, byUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

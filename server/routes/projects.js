const router = require('express').Router();
const auth = require('../middleware/auth');
const { query } = require('../db');

// Get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await query(`
      SELECT p.*, u.name as admin_name, pm.role as my_role,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      JOIN users u ON u.id = p.admin_id
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });

    const result = await query(
      'INSERT INTO projects (name, description, admin_id) VALUES (?, ?, ?)',
      [name, description || '', req.user.id]
    );
    await query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, req.user.id, 'admin']
    );
    res.json({ id: result.insertId, name, description, admin_id: req.user.id, my_role: 'admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get single project with members
router.get('/:id', auth, async (req, res) => {
  try {
    const projects = await query(`
      SELECT p.*, pm.role as my_role FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.id = ?
    `, [req.user.id, req.params.id]);
    if (!projects.length) return res.status(404).json({ error: 'Project not found' });

    const members = await query(`
      SELECT u.id, u.name, u.email, pm.role FROM users u
      JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [req.params.id]);

    res.json({ ...projects[0], members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Add member (admin only)
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const [me] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const users = await query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(404).json({ error: 'User not found' });

    await query(
      'INSERT IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, users[0].id, 'member']
    );
    res.json({ message: 'Member added', user: users[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member (admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const [me] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (parseInt(req.params.userId) === req.user.id)
      return res.status(400).json({ error: 'Cannot remove yourself' });

    await query(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Delete project (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const [me] = await query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './ProjectDetail.css';

const STATUSES = ['todo', 'inprogress', 'done'];
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const PRIORITIES = ['low', 'medium', 'high'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '', priority: 'medium', assigned_to: '' });
  const [taskError, setTaskError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit task
  const [editTask, setEditTask] = useState(null);

  // Add member
  const [memberEmail, setMemberEmail] = useState('');
  const [memberMsg, setMemberMsg] = useState('');

  const isAdmin = project?.my_role === 'admin';

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks/project/${id}`)
    ]).then(([p, t]) => {
      setProject(p.data);
      setTasks(t.data);
    }).catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const createTask = async e => {
    e.preventDefault();
    setTaskError(''); setCreating(true);
    try {
      const { data } = await api.post('/tasks', { ...taskForm, project_id: parseInt(id), assigned_to: taskForm.assigned_to || null });
      setTasks(prev => [data, ...prev]);
      setTaskForm({ title: '', description: '', due_date: '', priority: 'medium', assigned_to: '' });
      setShowTaskForm(false);
    } catch (err) {
      setTaskError(err.response?.data?.error || 'Failed');
    } finally { setCreating(false); }
  };

  const updateStatus = async (taskId, status) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
    } catch {}
  };

  const saveEdit = async e => {
    e.preventDefault();
    try {
      // Send only clean fields, never raw DB-joined fields
      const payload = {
        title: editTask.title,
        description: editTask.description,
        due_date: editTask.due_date ? String(editTask.due_date).slice(0,10) : null,
        priority: editTask.priority,
        status: editTask.status,
        assigned_to: editTask.assigned_to ? parseInt(editTask.assigned_to) || null : null,
      };
      const { data } = await api.put(`/tasks/${editTask.id}`, payload);
      setTasks(prev => prev.map(t => t.id === editTask.id ? data : t));
      setEditTask(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const deleteTask = async taskId => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {}
  };

  const addMember = async e => {
    e.preventDefault();
    setMemberMsg('');
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail });
      setMemberMsg('✓ Member added!');
      setMemberEmail('');
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
    } catch (err) {
      setMemberMsg('✗ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const removeMember = async userId => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
    } catch {}
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch {}
  };

  if (loading) return <div className="loading">Loading...</div>;

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  return (
    <div className="project-detail fade-in">
      <div className="detail-header">
        <div>
          <div className="breadcrumb" onClick={() => navigate('/projects')}>← Projects</div>
          <h1>{project.name}</h1>
          {project.description && <p className="page-sub">{project.description}</p>}
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowTaskForm(!showTaskForm)}>
              {showTaskForm ? '✕ Cancel' : '+ Add Task'}
            </button>
          )}
          {isAdmin && <button className="btn-danger" onClick={deleteProject}>Delete Project</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={activeTab === 'tasks' ? 'tab active' : 'tab'} onClick={() => setActiveTab('tasks')}>
          Tasks ({tasks.length})
        </button>
        <button className={activeTab === 'members' ? 'tab active' : 'tab'} onClick={() => setActiveTab('members')}>
          Members ({project.members?.length})
        </button>
      </div>

      {/* Task Form */}
      {showTaskForm && isAdmin && (
        <div className="create-form fade-in">
          <h3>New Task</h3>
          {taskError && <div className="form-error">{taskError}</div>}
          <form onSubmit={createTask}>
            <div className="form-row">
              <div className="field">
                <label>Title *</label>
                <input placeholder="Task title" value={taskForm.title}
                  onChange={e => setTaskForm({...taskForm, title: e.target.value})} required />
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Due Date</label>
                <input type="date" value={taskForm.due_date}
                  onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} />
              </div>
              <div className="field">
                <label>Assign To</label>
                <select value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}>
                  <option value="">Unassigned</option>
                  {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={2} placeholder="Optional description" value={taskForm.description}
                onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
            </div>
            <button className="btn-primary" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <div className="modal-overlay" onClick={() => setEditTask(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <form onSubmit={saveEdit}>
              <div className="field"><label>Title</label>
                <input value={editTask.title} onChange={e => setEditTask({...editTask, title: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="field"><label>Status</label>
                  <select value={editTask.status} onChange={e => setEditTask({...editTask, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="field"><label>Priority</label>
                  <select value={editTask.priority} onChange={e => setEditTask({...editTask, priority: e.target.value})}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field"><label>Due Date</label>
                  <input type="date" value={editTask.due_date?.slice(0,10) || ''}
                    onChange={e => setEditTask({...editTask, due_date: e.target.value})} />
                </div>
                <div className="field"><label>Assign To</label>
                  <select value={editTask.assigned_to || ''} onChange={e => setEditTask({...editTask, assigned_to: e.target.value || null})}>
                    <option value="">Unassigned</option>
                    {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Description</label>
                <textarea rows={3} value={editTask.description || ''}
                  onChange={e => setEditTask({...editTask, description: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditTask(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="kanban">
          {STATUSES.map(status => (
            <div className="kanban-col" key={status}>
              <div className="kanban-header">
                <span className={`status-dot ${status}`} />
                {STATUS_LABELS[status]}
                <span className="count">{tasksByStatus[status].length}</span>
              </div>
              <div className="kanban-tasks">
                {tasksByStatus[status].map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                  const canEdit = isAdmin || task.assigned_to === user.id;
                  return (
                    <div className="task-card" key={task.id}>
                      <div className="task-top">
                        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                        <div className="task-actions">
                          {canEdit && <button className="icon-btn" onClick={() => setEditTask(task)} title="Edit">✎</button>}
                          {isAdmin && <button className="icon-btn danger" onClick={() => deleteTask(task.id)} title="Delete">✕</button>}
                        </div>
                      </div>
                      <h4 className="task-title">{task.title}</h4>
                      {task.description && <p className="task-desc">{task.description}</p>}
                      <div className="task-footer">
                        {task.assigned_name && (
                          <span className="assigned-to">
                            <span className="mini-avatar">{task.assigned_name[0]}</span>
                            {task.assigned_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                            {isOverdue ? '⚠ ' : ''}
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {canEdit && task.status !== 'done' && (
                        <div className="status-buttons">
                          {task.status === 'todo' && (
                            <button className="status-btn" onClick={() => updateStatus(task.id, 'inprogress')}>
                              → Start
                            </button>
                          )}
                          {task.status === 'inprogress' && (
                            <button className="status-btn done" onClick={() => updateStatus(task.id, 'done')}>
                              ✓ Mark Done
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {tasksByStatus[status].length === 0 && (
                  <div className="col-empty">No tasks here</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="members-section fade-in">
          {isAdmin && (
            <div className="add-member-form">
              <h3>Add Member</h3>
              <form onSubmit={addMember} style={{ display: 'flex', gap: 10 }}>
                <input placeholder="member@email.com" value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)} type="email" required
                  style={{ flex: 1 }} />
                <button className="btn-primary" type="submit">Add</button>
              </form>
              {memberMsg && <p className={`member-msg ${memberMsg.startsWith('✓') ? 'success' : 'error'}`}>{memberMsg}</p>}
            </div>
          )}
          <div className="members-list">
            {project.members?.map(m => (
              <div className="member-row" key={m.id}>
                <div className="user-avatar">{m.name[0].toUpperCase()}</div>
                <div>
                  <div className="member-name">{m.name}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                <span className={`role-badge ${m.role}`}>{m.role}</span>
                {isAdmin && m.id !== user.id && (
                  <button className="btn-danger-sm" onClick={() => removeMember(m.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

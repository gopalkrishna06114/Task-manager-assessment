import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Projects.css';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async e => {
    e.preventDefault();
    setError(''); setCreating(true);
    try {
      const { data } = await api.post('/projects', form);
      setProjects(prev => [data, ...prev]);
      setForm({ name: '', description: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
    } finally { setCreating(false); }
  };

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="projects-page fade-in">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-sub">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {showForm && <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>}
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕' : '+ New Project'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="create-form fade-in">
          <h3>Create a new project</h3>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={create}>
            <div className="field">
              <label>Project name *</label>
              <input placeholder="e.g. Website Redesign" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} placeholder="What is this project about?"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <button className="btn-primary" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◫</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get your team started</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              <div className="project-card-top">
                <div className="project-icon">{p.name[0].toUpperCase()}</div>
                <span className={`role-badge ${p.my_role}`}>{p.my_role}</span>
              </div>
              <h3>{p.name}</h3>
              {p.description && <p className="project-desc">{p.description}</p>}
              <div className="project-footer">
                <span>👥 {p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                <span>✓ {p.task_count} task{p.task_count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

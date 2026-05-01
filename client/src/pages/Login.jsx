import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-logo">⬡</div>
        <h1>Nexus</h1>
        <p>The modern workspace for high-performing teams. Manage tasks, track progress, ship faster.</p>
        <div className="auth-features">
          <div className="auth-feature"><div className="auth-feature-icon">✓</div> Role-based team access</div>
          <div className="auth-feature"><div className="auth-feature-icon">◈</div> Kanban task boards</div>
          <div className="auth-feature"><div className="auth-feature-icon">▦</div> Real-time dashboard</div>
          <div className="auth-feature"><div className="auth-feature-icon">◉</div> Overdue task tracking</div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card fade-in">
          <div className="auth-card-header">
            <h2>Welcome back 👋</h2>
            <p>Sign in to continue to your workspace</p>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handle}>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@company.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
          <p className="auth-link">No account yet? <Link to="/register">Create one free</Link></p>
        </div>
      </div>
    </div>
  );
}

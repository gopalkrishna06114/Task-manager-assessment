import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handle = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-logo">⬡</div>
        <h1>Task Manager</h1>
        <p>Join thousands of teams already using Nexus to build better products, faster.</p>
        <div className="auth-features">
          <div className="auth-feature"><div className="auth-feature-icon">✓</div> Free to get started</div>
          <div className="auth-feature"><div className="auth-feature-icon">◈</div> Invite your whole team</div>
          <div className="auth-feature"><div className="auth-feature-icon">▦</div> Full project visibility</div>
          <div className="auth-feature"><div className="auth-feature-icon">◉</div> Secure JWT auth</div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card fade-in">
          <div className="auth-card-header">
            <h2>Create account</h2>
            <p>Get started for free — no credit card needed</p>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handle}>
            <div className="field">
              <label>Full Name</label>
              <input placeholder="Your full name" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@company.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Min 6 characters" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create free account →'}
            </button>
          </form>
          <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

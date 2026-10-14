import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FlowBackground from '../components/common/FlowBackground';
import HomeLink from '../components/common/HomeLink';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user);
      navigate('/today');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <FlowBackground theme="auto" />
      <HomeLink />
      <div className="auth-card">
        <div className="auth-logo">
          <svg className="auth-logo-svg" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="12" y="6" width="44" height="52" rx="8" fill="currentColor" />
            <rect x="6" y="15" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
            <rect x="6" y="29" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
            <rect x="6" y="43" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
            <g style={{ fill: 'var(--on-accent)' }}>
              <rect x="28" y="19" width="20" height="4.5" rx="2.2" />
              <rect x="28" y="30" width="20" height="4.5" rx="2.2" opacity="0.8" />
              <rect x="28" y="41" width="13" height="4.5" rx="2.2" opacity="0.65" />
            </g>
          </svg>
          <span>ToDo</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to your account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Your email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

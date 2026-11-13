import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import AlertBanner from '../../components/common/AlertBanner';
import { Shield, Eye, EyeOff, Lock, User, ArrowRight, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(form.username, form.password);

      if (result.success) {
        navigate(ROUTES.DASHBOARD);
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background ambient orbs */}
      <div className="login-bg-orbs">
        <div className="login-bg-orb" />
        <div className="login-bg-orb" />
        <div className="login-bg-orb" />
      </div>

      <div className="login-container">
        {/* Branding Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Shield size={28} color="white" />
          </div>
          <div>
            <div className="login-brand-name">
              IT Service Management Platform
              <span>Ministry of Higher Education</span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <h2 className="login-card-title">Welcome back</h2>
          <p className="login-card-subtitle">Sign in to your account to continue</p>

          <AlertBanner type="error" message={error} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="var(--gray-400)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  type="text"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--gray-400)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: '36px', paddingRight: '36px' }}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Don't have an account?{' '}
            </span>
            <Link
              to={ROUTES.SIGNUP}
              style={{
                fontSize: '0.85rem',
                color: 'var(--teal-600)',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
            >
              <UserPlus size={14} />
              Create an account
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '24px' }}>
            Ministry of Higher Education — IT Department
          </p>
        </div>
      </div>
    </div>
  );
}

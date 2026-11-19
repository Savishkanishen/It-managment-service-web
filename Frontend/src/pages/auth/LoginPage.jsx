import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import AlertBanner from '../../components/common/AlertBanner';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

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
      <div className="login-container">
        {/* Government Branding Header */}
        <div className="login-brand-header">
          <div className="login-emblem-wrap">
            <img
              src="/sri-lanka-emblem.svg"
              alt="State Emblem of Sri Lanka"
              className="login-emblem-img"
            />
          </div>
          <div>
            <div className="login-brand-name">
              IT Service Management Platform
              <span>Government of Sri Lanka • Ministry of Higher Education</span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <h2 className="login-card-title">Official Portal Sign In</h2>
          <p className="login-card-subtitle">Enter your authorized credentials to access the ITSM platform</p>

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

          <div className="login-footer-notice">
            Authorized government personnel only. Account credentials and role access are provisioned by the IT Department.
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--af-655-muted)', marginTop: '20px', marginBottom: 0 }}>
            Democratic Socialist Republic of Sri Lanka
          </p>
        </div>
      </div>
    </div>
  );
}

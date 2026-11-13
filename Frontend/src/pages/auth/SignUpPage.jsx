import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DIVISIONS, ROLES } from '../../data/mockData';
import { ROUTES } from '../../constants/routes';
import divisionService from '../../services/divisionService';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  User,
  Mail,
  Building,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SignUpPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    division: 'Information Technology',
    role: 'trainee',
    password: '',
    confirmPassword: '',
  });

  const [divisionsList, setDivisionsList] = useState(DIVISIONS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch live divisions from backend via divisionService
  useEffect(() => {
    let isMounted = true;
    const fetchDivisions = async () => {
      try {
        const data = await divisionService.getAllNames();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setDivisionsList(data);
        }
      } catch (e) {
        // Fallback to initial mock DIVISIONS
      }
    };
    fetchDivisions();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!form.name.trim()) {
      return setError('Please enter your full name');
    }
    if (!form.username.trim()) {
      return setError('Please choose a username');
    }
    if (form.username.trim().length < 3) {
      return setError('Username must be at least 3 characters');
    }
    if (!form.email.trim()) {
      return setError('Please enter your email address');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      return setError('Please enter a valid email address');
    }
    if (!form.password) {
      return setError('Please enter a password');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      const result = await register({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        division: form.division,
        role: form.role,
      });

      if (result.success) {
        setSuccess('Account created successfully! Redirecting to your dashboard...');
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD);
        }, 1500);
      } else {
        setError(result.error || 'Failed to create account');
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

      <div className="login-container" style={{ maxWidth: '520px' }}>
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

        {/* Sign Up Card */}
        <div className="login-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 className="login-card-title" style={{ margin: 0 }}>Create Account</h2>
            <Link
              to={ROUTES.LOGIN}
              style={{
                fontSize: '0.8rem',
                color: 'var(--gray-500)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
          <p className="login-card-subtitle" style={{ marginBottom: '20px' }}>
            Register your profile to get started with ITSM
          </p>

          {/* Feedback messages */}
          {error && (
            <div className="alert-card alert-card-error" style={{ marginBottom: '16px', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={18} color="var(--danger-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div className="alert-message">{error}</div>
            </div>
          )}

          {success && (
            <div className="alert-card alert-card-success" style={{ marginBottom: '16px', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={18} color="var(--success-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div className="alert-message">{success}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Row 1: Full Name & Username */}
            <div className="form-row" style={{ marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Full Name <span className="required">*</span>
                </label>
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
                    name="name"
                    placeholder="e.g. Aishath Ali"
                    value={form.name}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Username <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--gray-400)',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    @
                  </span>
                  <input
                    className="form-input"
                    style={{ paddingLeft: '32px' }}
                    type="text"
                    name="username"
                    placeholder="e.g. aishath"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="var(--gray-400)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  type="email"
                  name="email"
                  placeholder="e.g. aishath@mohe.gov.mv"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Row 2: Division & Role */}
            <div className="form-row" style={{ marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Division <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building
                    size={16}
                    color="var(--gray-400)"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                  />
                  <select
                    className="form-select"
                    style={{ paddingLeft: '36px' }}
                    name="division"
                    value={form.division}
                    onChange={handleChange}
                  >
                    {divisionsList.map((div, idx) => (
                      <option key={idx} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Role <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase
                    size={16}
                    color="var(--gray-400)"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                  />
                  <select
                    className="form-select"
                    style={{ paddingLeft: '36px' }}
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value={ROLES.TRAINEE}>Trainee / Staff</option>
                    <option value={ROLES.ZOOM_REQUESTER}>Zoom Requester</option>
                    <option value={ROLES.IT_ADMIN}>IT Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="form-row" style={{ marginBottom: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Password <span className="required">*</span>
                </label>
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
                    name="password"
                    placeholder="Min 6 chars"
                    value={form.password}
                    onChange={handleChange}
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Confirm Password <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="var(--gray-400)"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '36px', paddingRight: '36px' }}
                    type={showConfirmPw ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowConfirmPw(v => !v)}
                    style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password match feedback */}
            {form.confirmPassword && (
              <div
                style={{
                  fontSize: '0.75rem',
                  marginTop: '-10px',
                  marginBottom: '16px',
                  color: form.password === form.confirmPassword ? 'var(--success-600)' : 'var(--danger-500)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {form.password === form.confirmPassword ? (
                  <>
                    <CheckCircle2 size={13} /> Passwords match
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} /> Passwords do not match
                  </>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', padding: '11px', marginTop: 4 }}
              disabled={loading || !!success}
            >
              {loading ? (
                'Creating Account...'
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Already have an account?{' '}
            </span>
            <Link
              to={ROUTES.LOGIN}
              style={{
                fontSize: '0.85rem',
                color: 'var(--teal-600)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
            >
              Sign In
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '20px', marginBottom: 0 }}>
            Ministry of Higher Education — IT Department
          </p>
        </div>
      </div>
    </div>
  );
}

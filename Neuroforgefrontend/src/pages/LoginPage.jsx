import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const LoginPage = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token') || searchParams.get('resetToken');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setMode('reset');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, userId, fullName, role, status } = response.data;
      
      // Store authenticated session securely
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ userId, fullName, email, role, status }));
      localStorage.setItem('isAuthenticated', 'true');
      
      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      if (response.data && response.data.resetToken) {
        setResetToken(response.data.resetToken);
        setSuccess('Password reset link processed. Please set your new password below.');
        setMode('reset');
      } else {
        setSuccess(response.data.message || 'If an account exists, a reset instructions email has been sent.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Unable to process password reset request.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword || !confirmPassword) {
      setError('Reset token is missing or passwords are not filled.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and Confirm Password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/auth/reset-password', {
        token: resetToken,
        newPassword: newPassword
      });
      setSuccess(response.data.message || 'Password set successfully! Account activated. You can now log in.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to set password. Token may be invalid or expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-dark" style={{
      background: 'radial-gradient(circle at 10% 20%, rgb(18, 18, 24) 0%, rgb(28, 28, 38) 90.2%)'
    }}>
      <div className="card shadow-lg p-4 bg-opacity-10 border border-secondary border-opacity-25 rounded-4 text-light" style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#1e1e2d',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">NeuroForge</h2>
          <p className="text-secondary small">Enterprise SDLC Orchestrator</p>
        </div>

        {error && <div className="alert alert-danger py-2 text-center small">{error}</div>}
        {success && <div className="alert alert-success py-2 text-center small">{success}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label text-secondary small">Email Address</label>
              <input
                type="email"
                className="form-control bg-dark border-secondary text-light rounded-3"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-secondary small mb-0">Password</label>
                <button
                  type="button"
                  className="btn btn-link text-primary p-0 small text-decoration-none"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-light rounded-3"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2.5 rounded-3 fw-semibold mt-3" disabled={loading}>
              {loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
              Sign In
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <p className="text-light small mb-3">Enter your registered email address to receive a secure password reset token.</p>
            <div className="mb-3">
              <label className="form-label text-secondary small">Registered Email Address</label>
              <input
                type="email"
                className="form-control bg-dark border-secondary text-light rounded-3"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2.5 rounded-3 fw-semibold" disabled={loading}>
              {loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
              Request Reset Token
            </button>
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link text-secondary p-0 small text-decoration-none"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <p className="text-light small mb-3">Set a new password using your reset token.</p>
            <div className="mb-3">
              <label className="form-label text-secondary small">New Password</label>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-light rounded-3"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary small">Confirm Password</label>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-light rounded-3"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-success w-100 py-2.5 rounded-3 fw-semibold" disabled={loading}>
              {loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
              Reset Password
            </button>
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link text-secondary p-0 small text-decoration-none"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Sign In
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-4 small text-secondary border-top border-secondary border-opacity-25 pt-3">
          <i className="bi bi-shield-lock me-1"></i> Enterprise Grade Authentication System
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

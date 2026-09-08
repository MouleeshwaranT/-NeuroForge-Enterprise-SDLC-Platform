import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = currentUser.fullName || 'User';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [counts, setCounts] = useState({
    projects: 0,
    myTasks: 0,
    releases: 0
  });

  const [recentProjects, setRecentProjects] = useState([]);

  // Calculate dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 18) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Aug 30, 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [projRes, taskRes, releaseRes] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/tasks'),
        api.get('/api/releases')
      ]);

      const projects = projRes.data || [];
      const tasks = taskRes.data || [];
      const releases = releaseRes.data || [];

      // Filter tasks assigned to current user, fallback to total count if none tagged
      const userId = currentUser.userId;
      const userEmail = currentUser.email;
      const assignedTasks = tasks.filter(
        (t) =>
          (userId && String(t.assignedTo) === String(userId)) ||
          (userEmail && t.assignedToEmail === userEmail)
      );

      const myTasksCount = assignedTasks.length > 0 ? assignedTasks.length : tasks.length;

      setCounts({
        projects: projects.length,
        myTasks: myTasksCount,
        releases: releases.length
      });

      // Sort and slice latest 4 projects
      setRecentProjects([...projects].reverse().slice(0, 4));
    } catch (err) {
      console.error(err);
      setError('Failed to load workspace overview data from backend services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="theme-bg-app">
      {/* 1. WELCOME BANNER SECTION */}
      <div className="card theme-card rounded-4 p-4 mb-4 position-relative overflow-hidden shadow-sm" style={{
        background: 'linear-gradient(135deg, rgba(15, 25, 51, 0.95) 0%, rgba(22, 36, 71, 0.95) 60%, rgba(27, 27, 46, 0.95) 100%)',
        borderColor: 'rgba(59, 130, 246, 0.2)'
      }}>
        {/* Subtle Wave SVG Background */}
        <svg
          className="position-absolute end-0 top-0 h-100 opacity-25 pe-none"
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
          style={{ width: '50%' }}
        >
          <path d="M0,40 C150,90 350,-10 500,40 L500,150 L0,150 Z" fill="#3b82f6" />
        </svg>

        <div className="row align-items-center position-relative z-1">
          <div className="col-12 col-md-8">
            <span className="text-secondary small fw-bold tracking-wider d-block mb-1 text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              {getGreeting()}
            </span>
            <h2 className="fw-bold text-light mb-1 display-6 fs-3">
              Welcome back, <span style={{ color: '#3b82f6' }}>{userName}</span>
            </h2>
            <p className="text-secondary small mb-0">
              Here's a quick overview of your workspace.
            </p>
          </div>
          <div className="col-md-4 text-end d-none d-md-block">
            <div className="text-light fw-bold fs-6">Build better, together.</div>
            <div style={{ borderBottom: '2px solid #3b82f6', width: '60px', marginLeft: 'auto', marginTop: '4px' }}></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning border-warning border-opacity-25 rounded-3 py-2.5 mb-4 d-flex align-items-center gap-2 small">
          <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
          <div>{error}</div>
        </div>
      )}

      {/* 2. ONLY 3 SUMMARY CARDS ROW */}
      <div className="row g-3 mb-4">
        {/* Total Projects Card */}
        <div className="col-12 col-md-4">
          <div
            className="card rounded-4 p-3.5 shadow-sm h-100 cursor-pointer transition-all hover-opacity-75"
            style={{
              backgroundColor: 'rgba(15, 28, 56, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.25)'
            }}
            onClick={() => navigate('/projects')}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
                >
                  <i className="bi bi-folder-fill fs-4"></i>
                </div>
                <div>
                  <span className="text-secondary small fw-medium d-block">Total Projects</span>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                  ) : (
                    <h2 className="fw-bold mb-0 text-light fs-2">{counts.projects}</h2>
                  )}
                  <span className="text-secondary small" style={{ fontSize: '0.78rem' }}>Active workspaces</span>
                </div>
              </div>
              <i className="bi bi-chevron-right text-secondary fs-5"></i>
            </div>
          </div>
        </div>

        {/* My Tasks Card */}
        <div className="col-12 col-md-4">
          <div
            className="card rounded-4 p-3.5 shadow-sm h-100 cursor-pointer transition-all hover-opacity-75"
            style={{
              backgroundColor: 'rgba(13, 40, 30, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}
            onClick={() => navigate('/tasks')}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                >
                  <i className="bi bi-check2-square fs-4"></i>
                </div>
                <div>
                  <span className="text-secondary small fw-medium d-block">My Tasks</span>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-success" role="status" />
                  ) : (
                    <h2 className="fw-bold mb-0 text-light fs-2">{counts.myTasks}</h2>
                  )}
                  <span className="text-secondary small" style={{ fontSize: '0.78rem' }}>Assigned to you</span>
                </div>
              </div>
              <i className="bi bi-chevron-right text-secondary fs-5"></i>
            </div>
          </div>
        </div>

        {/* Recent Releases Card */}
        <div className="col-12 col-md-4">
          <div
            className="card rounded-4 p-3.5 shadow-sm h-100 cursor-pointer transition-all hover-opacity-75"
            style={{
              backgroundColor: 'rgba(35, 21, 52, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.25)'
            }}
            onClick={() => navigate('/releases')}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
                >
                  <i className="bi bi-rocket-takeoff-fill fs-4"></i>
                </div>
                <div>
                  <span className="text-secondary small fw-medium d-block">Recent Releases</span>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-purple" role="status" />
                  ) : (
                    <h2 className="fw-bold mb-0 text-light fs-2">{counts.releases}</h2>
                  )}
                  <span className="text-secondary small" style={{ fontSize: '0.78rem' }}>Published releases</span>
                </div>
              </div>
              <i className="bi bi-chevron-right text-secondary fs-5"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RECENT PROJECTS SECTION */}
      <div className="card theme-card rounded-4 p-4 shadow-sm mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <i className="bi bi-briefcase-fill text-light fs-5"></i>
            </div>
            <div>
              <h5 className="fw-bold mb-0 theme-text-main">Recent Projects</h5>
              <span className="text-secondary small">Your latest projects and their status.</span>
            </div>
          </div>
          <button
            className="btn btn-sm btn-outline-primary rounded-pill px-3.5 py-1.5 fw-semibold small d-flex align-items-center gap-1.5"
            onClick={() => navigate('/projects')}
          >
            <span>View All</span>
            <i className="bi bi-arrow-right"></i>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary spinner-border-sm" role="status" />
            <p className="text-secondary small mt-2">Loading recent projects...</p>
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="text-center py-4 text-secondary small">
            No active projects logged in system.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark align-middle mb-0 small">
              <thead>
                <tr className="border-bottom border-secondary border-opacity-25 text-secondary">
                  <th className="py-3 px-3">Project Name</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Created On</th>
                  <th className="py-3 text-end px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((proj) => (
                  <tr key={proj.projectId} className="border-bottom border-secondary border-opacity-10">
                    <td className="py-3 px-3">
                      <div className="fw-bold theme-text-main">{proj.name}</div>
                      <div className="text-secondary small text-truncate" style={{ maxWidth: '320px' }}>
                        {proj.description || 'AI-powered SDLC Management Backend'}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2.5 py-1.5 rounded-pill fw-semibold" style={{ fontSize: '0.72rem' }}>
                        {proj.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 text-secondary">
                      {formatDate(proj.createdAt || proj.startDate)}
                    </td>
                    <td className="py-3 text-end px-3">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary rounded-3 px-3 py-1 text-light fw-medium"
                          onClick={() => navigate('/projects')}
                        >
                          View
                        </button>
                        <button className="btn btn-sm btn-link text-secondary p-1" aria-label="Project actions">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. BOTTOM INFORMATION / COLLABORATION PANEL */}
      <div
        className="card rounded-4 p-4 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(12, 24, 54, 0.95) 0%, rgba(21, 34, 68, 0.95) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
      >
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-8">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                style={{ width: '48px', height: '48px', backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
              >
                <i className="bi bi-people-fill fs-4 text-primary"></i>
              </div>
              <div>
                <h5 className="fw-bold text-light mb-1 fs-5">Collaborate. Track. Deliver.</h5>
                <p className="text-secondary small mb-0">
                  Use NeuroForge to plan, build, test, and release high-quality software together.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-end d-none d-md-block">
            <div className="text-light fw-bold fs-6">Turn ideas into impact.</div>
            <div style={{ borderBottom: '2px solid #3b82f6', width: '60px', marginLeft: 'auto', marginTop: '4px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

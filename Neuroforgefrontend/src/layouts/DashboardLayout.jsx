import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userDisplayName = user.fullName || 'User';
  const userRole = user.role || 'GUEST';

  const isSystemAdmin = userRole === 'ADMIN' || userRole === 'ROLE_ADMIN' || (userRole && userRole.toUpperCase().includes('ADMIN'));

  const rawNavigationGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' }
      ]
    },
    {
      title: 'PLANNING',
      items: [
        { path: '/projects', label: 'Projects', icon: 'bi-briefcase' },
        { path: '/requirements', label: 'Requirements', icon: 'bi-file-earmark-check' },
        { path: '/sprints', label: 'Sprints', icon: 'bi-calendar-range' },
        { path: '/tasks', label: 'Tasks', icon: 'bi-list-task' }
      ]
    },
    {
      title: 'QUALITY ASSURANCE',
      items: [
        { path: '/testcases', label: 'Test Cases', icon: 'bi-shield-check' },
        { path: '/testruns', label: 'Test Runs', icon: 'bi-play-circle' },
        { path: '/bugs', label: 'Bugs', icon: 'bi-bug' }
      ]
    },
    {
      title: 'DELIVERY',
      items: [
        { path: '/releases', label: 'Releases', icon: 'bi-gift' },
        { path: '/build-pipelines', label: 'CI/CD Pipelines', icon: 'bi-cpu' },
        { path: '/deployments', label: 'Deployments', icon: 'bi-cloud-upload' }
      ]
    },
    {
      title: 'COLLABORATION',
      items: [
        { path: '/teams', label: 'Teams', icon: 'bi-people' },
        { path: '/chat', label: 'Chat', icon: 'bi-chat-dots' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { path: '/documents', label: 'Documents', icon: 'bi-file-earmark-text' },
        { path: '/metrics', label: 'Metrics', icon: 'bi-bar-chart-line' },
        { path: '/system-logs', label: 'System Logs', icon: 'bi-journal-code', adminOnly: true }
      ]
    },
    {
      title: 'ADMINISTRATION',
      adminOnly: true,
      items: [
        { path: '/users', label: 'Users', icon: 'bi-person-circle' }
      ]
    }
  ];

  const navigationGroups = rawNavigationGroups
    .filter((g) => !g.adminOnly || isSystemAdmin)
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.adminOnly || isSystemAdmin)
    }));

  const extraRouteTitles = {
    '/team-members': 'Team Members',
    '/notifications': 'Notifications'
  };

  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (extraRouteTitles[currentPath]) {
      return extraRouteTitles[currentPath];
    }
    for (const group of navigationGroups) {
      const match = group.items.find((item) => item.path === currentPath);
      if (match) return match.label;
    }
    return 'Dashboard';
  };

  const sidebarContent = (
    <div className="d-flex flex-column h-100 p-3 theme-sidebar border-end" style={{ width: '250px' }}>
      <div className="d-flex align-items-center mb-4 px-2 text-decoration-none">
        <div className="bg-primary text-white rounded-3 p-2 d-flex align-items-center justify-content-center me-2.5 shadow-sm" style={{ width: '34px', height: '34px' }}>
          <i className="bi bi-layers-half fs-5"></i>
        </div>
        <span className="fs-4 fw-bold tracking-tight theme-logo-text">NeuroForge</span>
      </div>
      <hr className="my-2 border-secondary opacity-25" />

      {/* Scrollable nav items */}
      <div className="flex-grow-1 overflow-y-auto pe-1" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {navigationGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-3">
            <span className="text-secondary small fw-bold px-3 py-1 d-block tracking-wider" style={{ fontSize: '0.7rem' }}>
              {group.title}
            </span>
            <ul className="nav nav-pills flex-column gap-1">
              {group.items.map((item) => (
                <li key={item.path} className="nav-item">
                  <NavLink
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `nav-link d-flex align-items-center rounded-3 px-3 py-2 text-decoration-none gap-2.5 small fw-medium transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'theme-nav-link hover-opacity-75'
                      }`
                    }
                  >
                    <i className={`bi ${item.icon} fs-6`}></i>
                    <span className="text-truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <hr className="my-2 border-secondary opacity-25" />
      <button className="btn btn-outline-danger d-flex align-items-center gap-2 rounded-3 w-100 py-2 justify-content-center small fw-semibold" onClick={handleLogout}>
        <i className="bi bi-box-arrow-right"></i>
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <div className="d-flex min-vh-100 theme-bg-app">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="d-none d-lg-block flex-shrink-0" style={{ width: '250px', height: '100vh', position: 'sticky', top: 0 }}>
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100 z-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="position-fixed top-0 start-0 h-100 z-3 shadow-lg"
            style={{ width: '250px', animation: 'slideIn 0.2s ease-out' }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column min-w-0">
        {/* Top Header Navbar */}
        <header className="navbar border-bottom px-4 py-3 theme-navbar shadow-sm">
          <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-outline-secondary d-lg-none p-1 rounded-2"
                onClick={() => setSidebarOpen(true)}
              >
                <i className="bi bi-list fs-4"></i>
              </button>
              <h4 className="mb-0 fw-bold theme-text-main">{getPageTitle()}</h4>
            </div>

            <div className="d-flex align-items-center gap-3">
              {/* Theme Toggle (Dark / Light Switch) */}
              <div className="d-flex align-items-center gap-1.5 px-2 py-1 rounded-pill theme-toggle-container border">
                <span style={{ fontSize: '0.85rem' }} role="img" aria-label="light-mode">☀️</span>
                <div className="form-check form-switch m-0 p-0 d-flex align-items-center">
                  <input
                    className="form-check-input theme-toggle-input cursor-pointer"
                    type="checkbox"
                    role="switch"
                    id="themeToggleSwitch"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    style={{ width: '2.2em', height: '1.1em', cursor: 'pointer' }}
                  />
                </div>
                <span style={{ fontSize: '0.85rem' }} role="img" aria-label="dark-mode">🌙</span>
              </div>

              <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25 px-2.5 py-1.5 rounded-pill small d-none d-sm-inline-block">
                v1.0.0-Beta
              </span>

              <button
                className="btn btn-link text-secondary p-1 position-relative"
                aria-label="Notifications"
                onClick={() => navigate('/notifications')}
                title="Notifications"
              >
                <i className="bi bi-bell fs-5"></i>
                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" />
              </button>

              <div className="vr d-none d-sm-block text-secondary opacity-25" />

              {/* Logged in User Identity */}
              <div className="d-flex align-items-center gap-2 cursor-pointer">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}>
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="d-none d-sm-block text-start">
                  <div className="small fw-bold leading-tight theme-text-main">{userDisplayName}</div>
                  <div className="text-secondary small" style={{ fontSize: '0.72rem' }}>{userRole}</div>
                </div>
                <i className="bi bi-chevron-down text-secondary ms-1 small"></i>
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-grow-1 p-4 overflow-y-auto">
          <div className="container-xl p-0">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;

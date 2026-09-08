import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import SprintsPage from '../pages/SprintsPage';
import RequirementsPage from '../pages/RequirementsPage';
import TasksPage from '../pages/TasksPage';
import TestCasesPage from '../pages/TestCasesPage';
import TestRunsPage from '../pages/TestRunsPage';
import BugsPage from '../pages/BugsPage';
import TeamsPage from '../pages/TeamsPage';
import TeamMembersPage from '../pages/TeamMembersPage';
import DocumentsPage from '../pages/DocumentsPage';
import MetricsPage from '../pages/MetricsPage';
import ReleasesPage from '../pages/ReleasesPage';
import BuildPipelinesPage from '../pages/BuildPipelinesPage';
import DeploymentsPage from '../pages/DeploymentsPage';
import ChatPage from '../pages/ChatPage';
import NotificationsPage from '../pages/NotificationsPage';
import SystemLogsPage from '../pages/SystemLogsPage';
import UsersPage from '../pages/UsersPage';
import PlaceholderPage from '../pages/PlaceholderPage';

// Simple Route Guard
const PrivateRoute = ({ children }) => {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true' && localStorage.getItem('token');
  return isAuth ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN' || user.role === 'ROLE_ADMIN';
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<LoginPage />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Placeholder Routes for all modules */}
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="sprints" element={<SprintsPage />} />
        <Route path="requirements" element={<RequirementsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="testcases" element={<TestCasesPage />} />
        <Route path="testruns" element={<TestRunsPage />} />
        <Route path="bugs" element={<BugsPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="team-members" element={<TeamMembersPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="releases" element={<ReleasesPage />} />
        <Route path="build-pipelines" element={<BuildPipelinesPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="system-logs" element={<SystemLogsPage />} />
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

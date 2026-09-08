import React, { useEffect, useState } from 'react';
import api from '../services/api';

const NotificationsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    notificationId: null,
    userId: currentUser.userId || '',
    projectId: '',
    teamId: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  const fetchDependenciesAndNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const [notifRes, projRes, teamRes, userRes] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/projects'),
        api.get('/api/teams'),
        api.get('/api/users')
      ]);
      setNotifications(notifRes.data || []);
      setProjects(projRes.data || []);
      setTeams(teamRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch system notifications from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndNotifications();
  }, []);

  const openCreateModal = () => {
    setFormData({
      notificationId: null,
      userId: currentUser.userId || (users.length > 0 ? users[0].userId : ''),
      projectId: projects.length > 0 ? projects[0].projectId : '',
      teamId: teams.length > 0 ? teams[0].teamId : ''
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (notif) => {
    setFormData({
      notificationId: notif.notificationId,
      userId: notif.userId || (currentUser.userId || ''),
      projectId: notif.projectId || (projects.length > 0 ? projects[0].projectId : ''),
      teamId: notif.teamId || (teams.length > 0 ? teams[0].teamId : '')
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userId) {
      setError('Target user is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Project link is required.');
      return;
    }
    if (!formData.teamId) {
      setError('Team link is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/notifications/${formData.notificationId}`, formData);
        setSuccessMsg('Notification updated successfully.');
      } else {
        await api.post('/api/notifications', formData);
        setSuccessMsg('Notification alert created successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndNotifications();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save notification.');
    }
  };

  const confirmDelete = (notif) => {
    setNotificationToDelete(notif);
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;
    try {
      await api.delete(`/api/notifications/${notificationToDelete.notificationId}`);
      setSuccessMsg('Notification deleted successfully.');
      setNotificationToDelete(null);
      fetchDependenciesAndNotifications();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete notification.');
      setNotificationToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredNotifications = notifications.filter((n) => {
    const targetUser = users.find(u => u.userId === n.userId);
    const userName = targetUser ? targetUser.fullName : '';
    const matchSearch =
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(n.notificationId).includes(searchTerm);
    const matchUser = userFilter === 'ALL' || n.userId === parseInt(userFilter, 10);
    const matchProject = projectFilter === 'ALL' || n.projectId === parseInt(projectFilter, 10);
    return matchSearch && matchUser && matchProject;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotifications = filteredNotifications.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">System Notifications & Alerts</h2>
          <p className="text-secondary small mb-0">Track system notifications, automated event alerts, and team notification rules</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={users.length === 0 || projects.length === 0 || teams.length === 0}
        >
          <i className="bi bi-bell-fill fs-5"></i>
          <span>Create Notification</span>
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success d-flex align-items-center alert-dismissible fade show rounded-3 py-2.5 mb-4" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center rounded-3 py-2.5 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card bg-dark border-secondary border-opacity-25 rounded-3 p-3 mb-4 shadow-sm" style={{ backgroundColor: '#1e1e2d' }}>
        <div className="row g-3">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-light rounded-end-3"
                placeholder="Search notifications by target user or ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Target Users</option>
              {users.map(u => (
                <option key={u.userId} value={u.userId}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Projects</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredNotifications.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading notification alerts...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-bell-slash display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Notifications Found</h4>
          <p className="text-secondary mb-4 small">You have zero notification rules or alerts recorded.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={users.length === 0 || projects.length === 0 || teams.length === 0}
          >
            Create Notification
          </button>
        </div>
      ) : (
        <>
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden mb-4" style={{ backgroundColor: '#1e1e2d' }}>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0 small">
                <thead>
                  <tr className="border-bottom border-secondary border-opacity-25">
                    <th className="px-4 py-3 text-secondary">ID</th>
                    <th className="py-3 text-secondary">Target User</th>
                    <th className="py-3 text-secondary">Summary & Scope</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentNotifications.map((notif) => {
                    const targetUser = users.find(u => u.userId === notif.userId);
                    const projectObj = projects.find(p => p.projectId === notif.projectId);
                    const teamObj = teams.find(t => t.teamId === notif.teamId);

                    const summaryText = `Notification alert regarding project [${
                      projectObj ? projectObj.name : `Project #${notif.projectId}`
                    }] and team [${teamObj ? teamObj.teamName : `Team #${notif.teamId}`}].`;

                    return (
                      <tr key={notif.notificationId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{notif.notificationId}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {targetUser ? targetUser.fullName : `User #${notif.userId}`}
                          </span>
                        </td>
                        <td className="small text-light">{summaryText}</td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(notif)}
                            title="Edit Notification"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(notif)}
                            title="Delete Notification"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-secondary small">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredNotifications.length)} of {filteredNotifications.length} notifications
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                    <button className="page-link bg-dark border-secondary text-light" onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link bg-dark border-secondary text-light" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </>
      )}

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-primary">
                  {isEditing ? 'Modify Notification Alert' : 'Create System Notification'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Target User</label>
                    <select
                      name="userId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.userId}
                      onChange={handleInputChange}
                      required
                    >
                      {users.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.fullName} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Project Association</label>
                    <select
                      name="projectId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.projectId}
                      onChange={handleInputChange}
                      required
                    >
                      {projects.map((p) => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Team Association</label>
                    <select
                      name="teamId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.teamId}
                      onChange={handleInputChange}
                      required
                    >
                      {teams.map((t) => (
                        <option key={t.teamId} value={t.teamId}>
                          {t.teamName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Create Notification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {notificationToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setNotificationToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete notification <strong>#{notificationToDelete.notificationId}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setNotificationToDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger rounded-3" onClick={handleDelete}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

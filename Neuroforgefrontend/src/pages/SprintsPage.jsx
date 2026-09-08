import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SprintsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toUpperCase();

  const isAdmin = userRole.includes('ADMIN');
  const isPM = userRole.includes('PROJECT_MANAGER') || userRole.includes('MANAGER');
  const canManage = isAdmin || isPM;

  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    sprintId: null,
    projectId: '',
    sprintName: '',
    goal: '',
    startDate: '',
    endDate: '',
    status: 'PLANNED'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState(null);

  const fetchSprintsAndProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [sprintRes, projRes] = await Promise.all([
        api.get('/api/sprints'),
        api.get('/api/projects')
      ]);
      setSprints(sprintRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch sprints from backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprintsAndProjects();
  }, []);

  const openCreateModal = () => {
    setFormData({
      sprintId: null,
      projectId: projects.length > 0 ? projects[0].projectId : '',
      sprintName: '',
      goal: '',
      startDate: '',
      endDate: '',
      status: 'PLANNED'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (sprint) => {
    setFormData({
      sprintId: sprint.sprintId,
      projectId: sprint.projectId || (projects.length > 0 ? projects[0].projectId : ''),
      sprintName: sprint.sprintName || '',
      goal: sprint.goal || '',
      startDate: sprint.startDate || '',
      endDate: sprint.endDate || '',
      status: sprint.status || 'PLANNED'
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'projectId' && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.sprintName.trim()) {
      setError('Sprint name is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Project selection is required.');
      return;
    }
    if (!formData.startDate) {
      setError('Sprint start date is required.');
      return;
    }
    if (!formData.endDate) {
      setError('Sprint end date is required.');
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Sprint end date cannot be before start date.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/sprints/${formData.sprintId}`, formData);
        setSuccessMsg('Sprint updated successfully.');
      } else {
        await api.post('/api/sprints', {
          ...formData,
          status: 'PLANNED'
        });
        setSuccessMsg('Sprint created successfully in PLANNED status.');
      }
      setShowModal(false);
      fetchSprintsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : null);
      setError(backendMsg || err.message || 'Failed to save sprint.');
    }
  };

  const handleSprintStatusChange = async (sprint, newStatus) => {
    try {
      await api.put(`/api/sprints/${sprint.sprintId}`, {
        ...sprint,
        status: newStatus
      });
      setSuccessMsg(`Sprint "${sprint.sprintName}" status updated to ${newStatus}.`);
      fetchSprintsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : null);
      setError(backendMsg || err.message || 'Failed to update sprint status.');
    }
  };

  const confirmDelete = (sprint) => {
    setSprintToDelete(sprint);
  };

  const handleDelete = async () => {
    if (!sprintToDelete) return;
    try {
      await api.delete(`/api/sprints/${sprintToDelete.sprintId}`);
      setSuccessMsg('Sprint deleted successfully.');
      setSprintToDelete(null);
      fetchSprintsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete sprint.');
      setSprintToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredSprints = sprints.filter((s) => {
    const matchSearch =
      (s.sprintName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.goal || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || s.projectId === parseInt(projectFilter, 10);
    const matchStatus = statusFilter === 'ALL' || (s.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchProject && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSprints.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSprints = filteredSprints.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light mb-1">Sprint Scheduling</h2>
          <p className="text-secondary small mb-0">Sprint Iteration Lifecycle: New Sprint &rarr; PLANNED &rarr; ACTIVE &rarr; COMPLETED</p>
        </div>
        {canManage && (
          <button 
            className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
            onClick={openCreateModal}
            disabled={projects.length === 0}
          >
            <i className="bi bi-plus-lg fs-5"></i>
            <span>Create Sprint</span>
          </button>
        )}
      </div>

      {projects.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active projects registered. Please create a Project before creating a Sprint.
        </div>
      )}

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
                placeholder="Search sprints by name or goal..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
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
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNED">PLANNED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredSprints.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading sprints...</p>
        </div>
      ) : filteredSprints.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-calendar-x display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Sprints Found</h4>
          <p className="text-secondary mb-4 small">Get started by planning your first sprint cycle.</p>
          {canManage && (
            <button 
              className="btn btn-primary mx-auto rounded-3 px-4" 
              onClick={openCreateModal}
              disabled={projects.length === 0}
            >
              Create Sprint
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden mb-4" style={{ backgroundColor: '#1e1e2d' }}>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0 small">
                <thead>
                  <tr className="border-bottom border-secondary border-opacity-25">
                    <th className="px-4 py-3 text-secondary">ID</th>
                    <th className="py-3 text-secondary">Sprint Name</th>
                    <th className="py-3 text-secondary">Project</th>
                    <th className="py-3 text-secondary">Sprint Goal</th>
                    <th className="py-3 text-secondary">Status</th>
                    <th className="py-3 text-secondary">Timeline</th>
                    {canManage && <th className="px-4 py-3 text-end text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentSprints.map((sprint) => {
                    const project = projects.find(p => p.projectId === sprint.projectId);
                    return (
                      <tr key={sprint.sprintId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{sprint.sprintId}</td>
                        <td className="fw-bold text-light">{sprint.sprintName}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {project ? project.name : `Project #${sprint.projectId}`}
                          </span>
                        </td>
                        <td className="small text-secondary text-truncate" style={{ maxWidth: '250px' }}>
                          {sprint.goal || 'No goal specified'}
                        </td>
                        <td>
                          <span className={`badge ${
                            sprint.status === 'COMPLETED' ? 'bg-success' :
                            sprint.status === 'ACTIVE' ? 'bg-primary' : 'bg-warning text-dark'
                          }`}>
                            {sprint.status || 'PLANNED'}
                          </span>
                        </td>
                        <td className="small text-secondary">
                          {sprint.startDate || 'N/A'} to {sprint.endDate || 'N/A'}
                        </td>
                        {canManage && (
                          <td className="px-4 text-end">
                            {sprint.status === 'PLANNED' && (
                              <button
                                className="btn btn-sm btn-outline-success me-1.5 rounded-2"
                                title="Start Sprint"
                                onClick={() => handleSprintStatusChange(sprint, 'ACTIVE')}
                              >
                                <i className="bi bi-play-circle me-1"></i>Start
                              </button>
                            )}
                            {sprint.status === 'ACTIVE' && (
                              <button
                                className="btn btn-sm btn-outline-primary me-1.5 rounded-2"
                                title="Complete Sprint"
                                onClick={() => handleSprintStatusChange(sprint, 'COMPLETED')}
                              >
                                <i className="bi bi-check-circle me-1"></i>Complete
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline-info me-1 rounded-2"
                              onClick={() => openEditModal(sprint)}
                              title="Edit Sprint"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger rounded-2"
                              onClick={() => confirmDelete(sprint)}
                              title="Delete Sprint"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        )}
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSprints.length)} of {filteredSprints.length} sprints
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

      {/* CREATE / EDIT SPRINT MODAL */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4 shadow-lg">
              <div className="modal-header border-secondary border-opacity-25 px-4 py-3">
                <h5 className="modal-title fw-bold text-light fs-5 mb-0">
                  {isEditing ? 'Edit Sprint Parameters' : 'Create New Sprint'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body px-4 py-3">
                  {error && (
                    <div className="alert alert-danger py-2 px-3 rounded-3 mb-3 small d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-triangle-fill fs-6"></i>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* 1. Sprint Name */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">
                      Sprint Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="sprintName"
                      className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      placeholder="e.g. Sprint 1 - Core Auth API"
                      value={formData.sprintName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* 2. Sprint Goal */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">Sprint Goal</label>
                    <textarea
                      name="goal"
                      className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      rows="2"
                      placeholder="Define sprint iteration objectives and deliverables..."
                      value={formData.goal}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>

                  {/* 3. Project Association & Initial Status */}
                  <div className="row mb-3 g-3">
                    <div className={isEditing ? "col-6" : "col-7"}>
                      <label className="form-label text-secondary small fw-semibold mb-1.5">
                        Project Association <span className="text-danger">*</span>
                      </label>
                      <select
                        name="projectId"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
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

                    <div className={isEditing ? "col-6" : "col-5"}>
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Sprint Status</label>
                      {isEditing ? (
                        <select
                          name="status"
                          className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="PLANNED">PLANNED</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      ) : (
                        <div className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small d-flex align-items-center justify-content-between">
                          <span className="badge bg-warning text-dark px-2.5 py-1 rounded-pill">PLANNED</span>
                          <span className="text-secondary extra-small" style={{ fontSize: '0.75rem' }}>Auto-assigned</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Start Date & End Date */}
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">
                        Start Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">
                        End Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3 px-4 py-2 small fw-semibold"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3 px-4 py-2 small fw-semibold shadow-sm"
                  >
                    {isEditing ? 'Save Changes' : 'Create Sprint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {sprintToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25 py-3 px-4">
                <h5 className="modal-title fw-bold text-danger fs-6 mb-0">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSprintToDelete(null)}></button>
              </div>
              <div className="modal-body px-4 py-3">
                <p className="mb-1">Are you sure you want to delete sprint <strong>{sprintToDelete.sprintName}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25 py-2.5 px-4">
                <button type="button" className="btn btn-sm btn-outline-secondary rounded-3 px-3" onClick={() => setSprintToDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-danger rounded-3 px-3" onClick={handleDelete}>
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

export default SprintsPage;

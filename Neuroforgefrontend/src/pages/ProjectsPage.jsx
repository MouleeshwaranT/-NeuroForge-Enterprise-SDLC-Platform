import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ProjectsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['ADMIN', 'ROLE_ADMIN'].includes(currentUser.role);
  const canManageProjects = ['ADMIN', 'ROLE_ADMIN', 'PROJECT_MANAGER', 'ROLE_PROJECT_MANAGER', 'MANAGER', 'ROLE_MANAGER'].includes(currentUser.role);

  const [projects, setProjects] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [pmError, setPmError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Form State
  const [formData, setFormData] = useState({
    projectId: null,
    name: '',
    description: '',
    status: 'IN_PROGRESS',
    startDate: '',
    endDate: '',
    createdBy: currentUser.userId || '',
    projectManagerId: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const fetchProjectsAndData = async () => {
    setLoading(true);
    setPmLoading(true);
    setError('');
    setPmError('');

    try {
      const projRes = await api.get('/api/projects');
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch project directory from the backend service.');
    } finally {
      setLoading(false);
    }

    if (isAdmin) {
      try {
        const pmRes = await api.get('/api/users/project-managers');
        setProjectManagers(pmRes.data || []);
      } catch (err) {
        console.error(err);
        setPmError('Failed to load eligible Project Managers from backend.');
      } finally {
        setPmLoading(false);
      }
    } else {
      setPmLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndData();
  }, []);

  const openCreateModal = () => {
    const defaultPm = isAdmin && projectManagers.length > 0 ? projectManagers[0].userId : currentUser.userId || '';
    setFormData({
      projectId: null,
      name: '',
      description: '',
      status: 'IN_PROGRESS',
      startDate: '',
      endDate: '',
      createdBy: currentUser.userId || '',
      projectManagerId: defaultPm
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (project) => {
    setFormData({
      projectId: project.projectId,
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'IN_PROGRESS',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      createdBy: project.createdBy || currentUser.userId || '',
      projectManagerId: project.projectManagerId || ''
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: (name === 'projectManagerId' || name === 'createdBy') && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (isAdmin && !formData.projectManagerId && !isEditing) {
      setError('A Project Manager is required. Please select an eligible Project Manager.');
      return;
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/projects/${formData.projectId}`, formData);
        setSuccessMsg('Project updated successfully.');
      } else {
        await api.post('/api/projects', formData);
        setSuccessMsg('Project created successfully.');
      }
      setShowModal(false);
      fetchProjectsAndData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save project.');
    }
  };

  const confirmDelete = (project) => {
    setProjectToDelete(project);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await api.delete(`/api/projects/${projectToDelete.projectId}`);
      setSuccessMsg('Project deleted successfully.');
      setProjectToDelete(null);
      fetchProjectsAndData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete project.');
      setProjectToDelete(null);
    }
  };

  // Filter and Search Logic
  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.projectManagerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === 'ALL' || (p.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Projects Directory</h2>
          <p className="text-secondary small mb-0">Orchestrate enterprise software project scopes, managers, and deliverable timelines</p>
        </div>
        {canManageProjects && (
          <button className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" onClick={openCreateModal}>
            <i className="bi bi-plus-lg fs-5"></i>
            <span>New Project</span>
          </button>
        )}
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

      {/* Filter and Search controls */}
      <div className="card bg-dark border-secondary border-opacity-25 rounded-3 p-3 mb-4 shadow-sm" style={{ backgroundColor: '#1e1e2d' }}>
        <div className="row g-3">
          <div className="col-12 col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-light rounded-end-3"
                placeholder="Search projects by name, description, or manager..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-12 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNING">PLANNING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ON_HOLD">ON_HOLD</option>
            </select>
          </div>
          <div className="col-12 col-md-2 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredProjects.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-folder-x display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Projects Found</h4>
          <p className="text-secondary mb-4 small">Get started by creating your very first SDLC project scope.</p>
          {canManageProjects && (
            <button className="btn btn-primary mx-auto rounded-3 px-4" onClick={openCreateModal}>
              Create Project
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
                    <th className="py-3 text-secondary">Project Name</th>
                    <th className="py-3 text-secondary">Status</th>
                    <th className="py-3 text-secondary">Timeline</th>
                    <th className="py-3 text-secondary">Project Manager</th>
                    {canManageProjects && <th className="px-4 py-3 text-end text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentProjects.map((proj) => {
                    return (
                      <tr key={proj.projectId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{proj.projectId}</td>
                        <td>
                          <div className="fw-bold text-light">{proj.name}</div>
                          <div className="small text-secondary text-truncate" style={{ maxWidth: '320px' }}>
                            {proj.description || 'No description provided'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            proj.status === 'COMPLETED' ? 'bg-success' :
                            proj.status === 'IN_PROGRESS' ? 'bg-primary' :
                            proj.status === 'ON_HOLD' ? 'bg-danger' : 'bg-warning text-dark'
                          }`}>
                            {proj.status}
                          </span>
                        </td>
                        <td className="small text-secondary">
                          {proj.startDate || 'N/A'} to {proj.endDate || 'N/A'}
                        </td>
                        <td className="small text-light">
                          {proj.projectManagerName ? (
                            <div className="d-flex align-items-center gap-1">
                              <span>{proj.projectManagerName}</span>
                              {proj.projectManagerStatus === 'INACTIVE' && (
                                <span className="badge bg-warning text-dark px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>Inactive</span>
                              )}
                              {proj.projectManagerStatus === 'DELETED' && (
                                <span className="badge bg-danger px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>Deleted</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-secondary">Unassigned</span>
                          )}
                        </td>
                        {canManageProjects && (
                          <td className="px-4 text-end">
                            <button
                              className="btn btn-sm btn-outline-info me-2 rounded-2"
                              onClick={() => openEditModal(proj)}
                              title="Edit Project"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger rounded-2"
                              onClick={() => confirmDelete(proj)}
                              title="Delete Project"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredProjects.length)} of {filteredProjects.length} projects
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
                  {isEditing ? 'Modify Project Scope' : 'Initiate New Project'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Project Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Description</label>
                    <textarea
                      name="description"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      rows="3"
                      value={formData.description}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  <div className="row mb-3">
                    <div className={isAdmin ? "col-6" : "col-12"}>
                      <label className="form-label text-secondary small">Project Status</label>
                      <select
                        name="status"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="PLANNING">PLANNING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ON_HOLD">ON_HOLD</option>
                      </select>
                    </div>
                    {isAdmin && (
                      <div className="col-6">
                        <label className="form-label text-secondary small">Project Manager</label>
                        {pmLoading ? (
                          <div className="form-control bg-dark border-secondary text-secondary rounded-3 d-flex align-items-center gap-2 small">
                            <span className="spinner-border spinner-border-sm" role="status"></span> Loading Project Managers...
                          </div>
                        ) : pmError ? (
                          <div className="alert alert-danger border-danger border-opacity-25 rounded-3 p-2 small mb-0 d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                            <div>
                              <i className="bi bi-exclamation-octagon-fill me-1"></i> {pmError}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-light py-0 px-2 rounded-2 ms-2"
                              style={{ fontSize: '0.7rem' }}
                              onClick={fetchProjectsAndData}
                            >
                              Retry
                            </button>
                          </div>
                        ) : projectManagers.length === 0 && !isEditing ? (
                          <div className="alert alert-warning border-warning border-opacity-25 rounded-3 p-2 small mb-0" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            No eligible Project Managers are available. Please create or activate a Project Manager before creating this project.
                          </div>
                        ) : (
                          <select
                            name="projectManagerId"
                            className="form-select bg-dark border-secondary text-light rounded-3"
                            value={formData.projectManagerId}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="" disabled>Select Project Manager</option>
                            {isEditing && formData.projectManagerId && !projectManagers.some(pm => pm.userId === parseInt(formData.projectManagerId, 10)) && (
                              <option value={formData.projectManagerId} disabled>
                                {projects.find(p => p.projectId === formData.projectId)?.projectManagerName || 'Current Manager'} (Inactive / Revoked)
                              </option>
                            )}
                            {projectManagers.map((pm) => (
                              <option key={pm.userId} value={pm.userId}>
                                {pm.fullName}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.startDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.endDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3 px-4"
                    disabled={!isEditing && isAdmin && projectManagers.length === 0}
                  >
                    {isEditing ? 'Save Changes' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {projectToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setProjectToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete project <strong>{projectToDelete.name}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setProjectToDelete(null)}>
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

export default ProjectsPage;


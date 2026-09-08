import React, { useEffect, useState } from 'react';
import api from '../services/api';

const RequirementsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toUpperCase();

  const isAdmin = userRole.includes('ADMIN');
  const isPM = userRole.includes('PROJECT_MANAGER') || userRole.includes('MANAGER');
  const isDev = userRole.includes('DEVELOPER');
  const isTester = userRole.includes('TESTER');

  const canCreate = isAdmin || isPM;
  const canApprove = isAdmin || isPM;
  const canImplement = isAdmin || isPM || isDev;
  const canVerify = isAdmin || isPM || isTester;
  const canEdit = isAdmin || isPM || isDev || isTester;
  const canDelete = isAdmin || isPM;

  const [requirements, setRequirements] = useState([]);
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
    requirementId: null,
    projectId: '',
    description: '',
    priority: 'MEDIUM',
    status: 'DRAFT'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState(null);

  const fetchRequirementsAndProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, projRes] = await Promise.all([
        api.get('/api/requirements'),
        api.get('/api/projects')
      ]);
      setRequirements(reqRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch requirements from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirementsAndProjects();
  }, []);

  const openCreateModal = () => {
    setFormData({
      requirementId: null,
      projectId: projects.length > 0 ? projects[0].projectId : '',
      description: '',
      priority: 'MEDIUM',
      status: 'DRAFT'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (req) => {
    setFormData({
      requirementId: req.requirementId,
      projectId: req.projectId || (projects.length > 0 ? projects[0].projectId : ''),
      description: req.description || '',
      priority: req.priority || 'MEDIUM',
      status: req.status || 'DRAFT'
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
    if (!formData.description.trim()) {
      setError('Title/Description is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Project selection is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/requirements/${formData.requirementId}`, formData);
        setSuccessMsg('Requirement updated successfully.');
      } else {
        await api.post('/api/requirements', formData);
        setSuccessMsg('Requirement created successfully.');
      }
      setShowModal(false);
      fetchRequirementsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : null);
      setError(backendMessage || err.message || 'Failed to save requirement.');
    }
  };

  const handleTransition = async (reqId, targetStatus) => {
    setError('');
    setSuccessMsg('');
    try {
      await api.post(`/api/requirements/${reqId}/transition`, { status: targetStatus });
      setSuccessMsg(`Requirement #${reqId} transitioned to ${targetStatus}.`);
      fetchRequirementsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || `Failed to transition requirement to ${targetStatus}.`);
    }
  };

  const confirmDelete = (req) => {
    setRequirementToDelete(req);
  };

  const handleDelete = async () => {
    if (!requirementToDelete) return;
    try {
      await api.delete(`/api/requirements/${requirementToDelete.requirementId}`);
      setSuccessMsg('Requirement deleted successfully.');
      setRequirementToDelete(null);
      fetchRequirementsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete requirement.');
      setRequirementToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredRequirements = requirements.filter((r) => {
    const matchSearch = (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || r.projectId === parseInt(projectFilter, 10);
    const matchStatus = statusFilter === 'ALL' || (r.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchProject && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequirements = filteredRequirements.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light mb-1">Requirements</h2>
          <p className="text-secondary small mb-0">Lifecycle: DRAFT &rarr; APPROVED &rarr; IMPLEMENTED &rarr; VERIFIED</p>
        </div>
        {canCreate && (
          <button 
            className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
            onClick={openCreateModal}
            disabled={projects.length === 0}
          >
            <i className="bi bi-plus-lg fs-5"></i>
            <span>New Requirement</span>
          </button>
        )}
      </div>

      {projects.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active projects. Please create a Project before creating Requirements.
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
                placeholder="Search requirements..."
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
              <option value="ALL">All Lifecycle Stages</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="IMPLEMENTED">IMPLEMENTED</option>
              <option value="VERIFIED">VERIFIED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredRequirements.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading requirements...</p>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-file-earmark-text display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Requirements Found</h4>
          <p className="text-secondary mb-4 small">Create requirements to track feature deliverables.</p>
          {canCreate && (
            <button 
              className="btn btn-primary mx-auto rounded-3 px-4" 
              onClick={openCreateModal}
              disabled={projects.length === 0}
            >
              Create Requirement
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
                    <th className="py-3 text-secondary">Title / Description</th>
                    <th className="py-3 text-secondary">Associated Project</th>
                    <th className="py-3 text-secondary">Priority</th>
                    <th className="py-3 text-secondary">Stage</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRequirements.map((req) => {
                    const project = projects.find(p => p.projectId === req.projectId);
                    const status = (req.status || 'DRAFT').toUpperCase();

                    return (
                      <tr key={req.requirementId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{req.requirementId}</td>
                        <td className="fw-bold text-light">
                          <div>{req.description}</div>
                          {req.updatedBy && req.updatedAt && (
                            <div className="text-secondary extra-small fw-normal mt-0.5 opacity-75" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-clock-history me-1"></i>
                              Mod: {req.updatedBy.split('@')[0]} ({new Date(req.updatedAt).toLocaleDateString()})
                              {req.previousContent && (
                                <span className="ms-1 opacity-75" title={`Previous version: ${req.previousContent}`}>• prior content saved</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {project ? project.name : `Project #${req.projectId}`}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            req.priority === 'HIGH' ? 'bg-danger' :
                            req.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-info text-dark'
                          }`}>
                            {req.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge px-2.5 py-1.5 rounded-pill ${
                            status === 'VERIFIED' ? 'bg-success' :
                            status === 'IMPLEMENTED' ? 'bg-primary' :
                            status === 'APPROVED' ? 'bg-info text-dark' : 'bg-secondary'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 text-end">
                          <div className="d-flex align-items-center gap-2 justify-content-end">
                            {/* Next Lifecycle Stage Action Button */}
                            {status === 'DRAFT' && canApprove && (
                              <button
                                className="btn btn-sm btn-success rounded-2 px-3 py-1 fw-semibold text-nowrap"
                                onClick={() => handleTransition(req.requirementId, 'APPROVED')}
                                title="Approve Requirement"
                              >
                                Approve
                              </button>
                            )}

                            {status === 'APPROVED' && canImplement && (
                              <button
                                className="btn btn-sm btn-primary rounded-2 px-3 py-1 fw-semibold text-nowrap"
                                onClick={() => handleTransition(req.requirementId, 'IMPLEMENTED')}
                                title="Mark Requirement as Implemented"
                              >
                                Mark Implemented
                              </button>
                            )}

                            {status === 'IMPLEMENTED' && canVerify && (
                              <button
                                className="btn btn-sm btn-info text-dark rounded-2 px-3 py-1 fw-semibold text-nowrap"
                                onClick={() => handleTransition(req.requirementId, 'VERIFIED')}
                                title="Verify Requirement"
                              >
                                Mark Verified
                              </button>
                            )}

                            {status === 'VERIFIED' && (
                              <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2.5 py-1.5 rounded-pill small">
                                <i className="bi bi-check-all me-1"></i>Verified
                              </span>
                            )}

                            {/* Simple Edit Action */}
                            {canEdit && (
                              <button
                                className="btn btn-sm btn-outline-info rounded-2 p-1.5 ms-1"
                                onClick={() => openEditModal(req)}
                                title="Edit Requirement"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                            )}

                            {/* Simple Delete Action */}
                            {canDelete && (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-2 p-1.5"
                                onClick={() => confirmDelete(req)}
                                title="Delete Requirement"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRequirements.length)} of {filteredRequirements.length} requirements
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

      {/* CREATE / EDIT REQUIREMENT MODAL */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4 shadow-lg">
              <div className="modal-header border-secondary border-opacity-25 px-4 py-3">
                <h5 className="modal-title fw-bold text-light fs-5 mb-0">
                  {isEditing ? 'Edit Requirement' : 'New Requirement'}
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

                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1">Title / Description</label>
                    <textarea
                      name="description"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      rows="3"
                      placeholder="Enter requirement title or description..."
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1">Associated Project</label>
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

                  <div className="mb-2">
                    <label className="form-label text-secondary small fw-semibold mb-1">Priority Level</label>
                    <select
                      name="priority"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between">
                  <button type="button" className="btn btn-outline-secondary rounded-3 px-4" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 fw-semibold">
                    {isEditing ? 'Save Changes' : 'Create Requirement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {requirementToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger fs-6">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setRequirementToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-1">Are you sure you want to delete requirement <strong>#{requirementToDelete.requirementId}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25 py-2">
                <button type="button" className="btn btn-sm btn-outline-secondary rounded-3 px-3" onClick={() => setRequirementToDelete(null)}>
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

export default RequirementsPage;

import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ReleasesPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = ['ADMIN', 'ROLE_ADMIN', 'PROJECT_MANAGER', 'ROLE_PROJECT_MANAGER'].includes(currentUser.role);

  const [releases, setReleases] = useState([]);
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
    releaseId: null,
    projectId: '',
    releaseName: '',
    version: '',
    releaseDate: '',
    status: 'PLANNING'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState(null);

  const fetchReleasesAndProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [releaseRes, projRes] = await Promise.all([
        api.get('/api/releases'),
        api.get('/api/projects')
      ]);
      setReleases(releaseRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch release milestones from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleasesAndProjects();
  }, []);

  const openCreateModal = () => {
    setFormData({
      releaseId: null,
      projectId: projects.length > 0 ? projects[0].projectId : '',
      releaseName: '',
      version: '',
      releaseDate: '',
      status: 'PLANNING'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (release) => {
    setFormData({
      releaseId: release.releaseId,
      projectId: release.projectId || (projects.length > 0 ? projects[0].projectId : ''),
      releaseName: release.releaseName || '',
      version: release.version || '',
      releaseDate: release.releaseDate || '',
      status: release.status || 'PLANNING'
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
    if (!formData.releaseName.trim()) {
      setError('Release name is required.');
      return;
    }
    if (!formData.version.trim()) {
      setError('Version is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Valid project association is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/releases/${formData.releaseId}`, formData);
        setSuccessMsg('Release milestone updated successfully.');
      } else {
        await api.post('/api/releases', formData);
        setSuccessMsg('Release milestone created successfully.');
      }
      setShowModal(false);
      fetchReleasesAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save release.');
    }
  };

  const confirmDelete = (release) => {
    setReleaseToDelete(release);
  };

  const handleDelete = async () => {
    if (!releaseToDelete) return;
    try {
      await api.delete(`/api/releases/${releaseToDelete.releaseId}`);
      setSuccessMsg('Release profile deleted successfully.');
      setReleaseToDelete(null);
      fetchReleasesAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete release.');
      setReleaseToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredReleases = releases.filter((r) => {
    const matchSearch =
      (r.releaseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.version || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || r.projectId === parseInt(projectFilter, 10);
    const matchStatus = statusFilter === 'ALL' || (r.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchProject && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReleases.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReleases = filteredReleases.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Release Milestones</h2>
          <p className="text-secondary small mb-0">Track software version releases, iteration scopes, and production launch checkpoints</p>
        </div>
        {canManage && (
          <button 
            className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
            onClick={openCreateModal}
            disabled={projects.length === 0}
          >
            <i className="bi bi-plus-lg fs-5"></i>
            <span>New Release</span>
          </button>
        )}
      </div>

      {projects.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active projects registered. Please create a Project before creating a Release milestone.
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
                placeholder="Search releases by name or version..."
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
              <option value="PLANNING">PLANNING</option>
              <option value="RELEASED">RELEASED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredReleases.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading releases registry...</p>
        </div>
      ) : filteredReleases.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-gift-fill display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Releases Found</h4>
          <p className="text-secondary mb-4 small">Get started by scheduling your first release milestone.</p>
          {canManage && (
            <button 
              className="btn btn-primary mx-auto rounded-3 px-4" 
              onClick={openCreateModal}
              disabled={projects.length === 0}
            >
              Create Release
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
                    <th className="py-3 text-secondary">Release Name</th>
                    <th className="py-3 text-secondary">Version</th>
                    <th className="py-3 text-secondary">Project Link</th>
                    <th className="py-3 text-secondary">Release Target Date</th>
                    <th className="py-3 text-secondary">Status</th>
                    {canManage && <th className="px-4 py-3 text-end text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentReleases.map((release) => {
                    const project = projects.find(p => p.projectId === release.projectId);
                    return (
                      <tr key={release.releaseId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{release.releaseId}</td>
                        <td className="fw-bold text-light">{release.releaseName}</td>
                        <td>
                          <span className="badge bg-info text-dark font-monospace">{release.version}</span>
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {project ? project.name : `Project #${release.projectId}`}
                          </span>
                        </td>
                        <td className="small text-secondary">{release.releaseDate || 'N/A'}</td>
                        <td>
                          <span className={`badge ${
                            release.status === 'RELEASED' ? 'bg-success' :
                            release.status === 'PLANNING' ? 'bg-primary' : 'bg-danger'
                          }`}>
                            {release.status}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-4 text-end">
                            <button
                              className="btn btn-sm btn-outline-info me-2 rounded-2"
                              onClick={() => openEditModal(release)}
                              title="Edit Release"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger rounded-2"
                              onClick={() => confirmDelete(release)}
                              title="Delete Release"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReleases.length)} of {filteredReleases.length} releases
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
                  {isEditing ? 'Modify Release Profile' : 'Schedule Release Milestone'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Release Name</label>
                      <input
                        type="text"
                        name="releaseName"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.releaseName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Version</label>
                      <input
                        type="text"
                        name="version"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        placeholder="e.g. v2.4.1"
                        value={formData.version}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Project Link</label>
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
                  <div className="row">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Target Release Date</label>
                      <input
                        type="date"
                        name="releaseDate"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.releaseDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Release Status</label>
                      <select
                        name="status"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="PLANNING">PLANNING</option>
                        <option value="RELEASED">RELEASED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Schedule Release'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {releaseToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setReleaseToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete release <strong>{releaseToDelete.releaseName}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setReleaseToDelete(null)}>
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

export default ReleasesPage;

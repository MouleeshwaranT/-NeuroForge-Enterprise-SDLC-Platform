import React, { useEffect, useState } from 'react';
import api from '../services/api';

const BuildPipelinesPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [pipelines, setPipelines] = useState([]);
  const [releases, setReleases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [releaseFilter, setReleaseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    pipelineId: null,
    releaseId: '',
    pipelineName: '',
    triggeredBy: '',
    status: 'QUEUED'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState(null);

  const fetchDependenciesAndPipelines = async () => {
    setLoading(true);
    setError('');
    try {
      const [pipeRes, relRes, userRes] = await Promise.all([
        api.get('/api/build-pipelines'),
        api.get('/api/releases'),
        api.get('/api/users')
      ]);
      setPipelines(pipeRes.data || []);
      setReleases(relRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch build pipelines from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndPipelines();
  }, []);

  const openCreateModal = () => {
    setFormData({
      pipelineId: null,
      releaseId: releases.length > 0 ? releases[0].releaseId : '',
      pipelineName: '',
      triggeredBy: currentUser.userId || (users.length > 0 ? users[0].userId : ''),
      status: 'QUEUED'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (pipe) => {
    setFormData({
      pipelineId: pipe.pipelineId,
      releaseId: pipe.releaseId || (releases.length > 0 ? releases[0].releaseId : ''),
      pipelineName: pipe.pipelineName || '',
      triggeredBy: pipe.triggeredBy || (currentUser.userId || ''),
      status: pipe.status || 'QUEUED'
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['releaseId', 'triggeredBy'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumericField && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pipelineName.trim()) {
      setError('Pipeline name is required.');
      return;
    }
    if (!formData.releaseId) {
      setError('Release association is required.');
      return;
    }
    if (!formData.triggeredBy) {
      setError('Triggered By user is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/build-pipelines/${formData.pipelineId}`, formData);
        setSuccessMsg('Build pipeline updated successfully.');
      } else {
        await api.post('/api/build-pipelines', formData);
        setSuccessMsg('Build pipeline configured and registered successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndPipelines();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save build pipeline.');
    }
  };

  const handleTriggerBuild = async (pipe) => {
    try {
      // Simulate/Trigger pipeline run state to RUNNING then SUCCESS
      await api.put(`/api/build-pipelines/${pipe.pipelineId}`, {
        ...pipe,
        status: 'RUNNING'
      });
      setSuccessMsg(`Build pipeline "${pipe.pipelineName}" triggered into RUNNING state.`);
      fetchDependenciesAndPipelines();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to trigger pipeline.');
    }
  };

  const confirmDelete = (pipe) => {
    setPipelineToDelete(pipe);
  };

  const handleDelete = async () => {
    if (!pipelineToDelete) return;
    try {
      await api.delete(`/api/build-pipelines/${pipelineToDelete.pipelineId}`);
      setSuccessMsg('Build pipeline deleted successfully.');
      setPipelineToDelete(null);
      fetchDependenciesAndPipelines();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete pipeline.');
      setPipelineToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredPipelines = pipelines.filter((p) => {
    const matchSearch = (p.pipelineName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRelease = releaseFilter === 'ALL' || p.releaseId === parseInt(releaseFilter, 10);
    const matchStatus = statusFilter === 'ALL' || (p.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchRelease && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPipelines.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPipelines = filteredPipelines.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">CI/CD Build Pipelines</h2>
          <p className="text-secondary small mb-0">Automate software builds, track compilation steps, and trigger release builds</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={releases.length === 0}
        >
          <i className="bi bi-plus-lg fs-5"></i>
          <span>New Pipeline</span>
        </button>
      </div>

      {releases.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No release milestones registered. Please create a Release before configuring a Build Pipeline.
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
                placeholder="Search build pipelines by name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={releaseFilter}
              onChange={(e) => { setReleaseFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Releases</option>
              {releases.map(r => (
                <option key={r.releaseId} value={r.releaseId}>{r.releaseName} ({r.version})</option>
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
              <option value="QUEUED">QUEUED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredPipelines.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading build pipelines registry...</p>
        </div>
      ) : filteredPipelines.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-cpu display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Pipelines Found</h4>
          <p className="text-secondary mb-4 small">Get started by defining your first automated build pipeline.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={releases.length === 0}
          >
            Create Pipeline
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
                    <th className="py-3 text-secondary">Pipeline Name</th>
                    <th className="py-3 text-secondary">Release Link</th>
                    <th className="py-3 text-secondary">Triggered By</th>
                    <th className="py-3 text-secondary">Status</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPipelines.map((pipe) => {
                    const releaseObj = releases.find(r => r.releaseId === pipe.releaseId);
                    const userObj = users.find(u => u.userId === pipe.triggeredBy);
                    return (
                      <tr key={pipe.pipelineId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{pipe.pipelineId}</td>
                        <td className="fw-bold text-light">{pipe.pipelineName}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {releaseObj ? `${releaseObj.releaseName} (${releaseObj.version})` : `Release #${pipe.releaseId}`}
                          </span>
                        </td>
                        <td className="small text-light">
                          {userObj ? userObj.fullName : `User #${pipe.triggeredBy}`}
                        </td>
                        <td>
                          <span className={`badge ${
                            pipe.status === 'SUCCESS' ? 'bg-success' :
                            pipe.status === 'FAILURE' ? 'bg-danger' :
                            pipe.status === 'RUNNING' ? 'bg-primary' : 'bg-warning text-dark'
                          }`}>
                            {pipe.status}
                          </span>
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-success me-1 rounded-2"
                            onClick={() => handleTriggerBuild(pipe)}
                            title="Trigger Build Execution"
                          >
                            <i className="bi bi-play-fill me-1"></i>Run
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info me-1 rounded-2"
                            onClick={() => openEditModal(pipe)}
                            title="Edit Pipeline"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(pipe)}
                            title="Delete Pipeline"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPipelines.length)} of {filteredPipelines.length} pipelines
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
                  {isEditing ? 'Modify Pipeline Specification' : 'Configure Build Pipeline'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Pipeline Name</label>
                    <input
                      type="text"
                      name="pipelineName"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.pipelineName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Release Link</label>
                      <select
                        name="releaseId"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.releaseId}
                        onChange={handleInputChange}
                        required
                      >
                        {releases.map((r) => (
                          <option key={r.releaseId} value={r.releaseId}>
                            {r.releaseName} ({r.version})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Triggered By User</label>
                      <select
                        name="triggeredBy"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.triggeredBy}
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
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Pipeline Status</label>
                    <select
                      name="status"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="QUEUED">QUEUED</option>
                      <option value="RUNNING">RUNNING</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILURE">FAILURE</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Configure Pipeline'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {pipelineToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPipelineToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete pipeline <strong>{pipelineToDelete.pipelineName}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setPipelineToDelete(null)}>
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

export default BuildPipelinesPage;

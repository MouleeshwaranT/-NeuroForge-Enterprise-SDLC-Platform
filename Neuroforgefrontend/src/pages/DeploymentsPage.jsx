import React, { useEffect, useState } from 'react';
import api from '../services/api';

const DeploymentsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [deployments, setDeployments] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [envFilter, setEnvFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    deploymentId: null,
    pipelineId: '',
    environment: 'DEVELOPMENT',
    deployedBy: '',
    status: 'IN_PROGRESS'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deploymentToDelete, setDeploymentToDelete] = useState(null);

  const fetchDependenciesAndDeployments = async () => {
    setLoading(true);
    setError('');
    try {
      const [depRes, pipeRes, userRes] = await Promise.all([
        api.get('/api/deployments'),
        api.get('/api/build-pipelines'),
        api.get('/api/users')
      ]);
      setDeployments(depRes.data || []);
      setPipelines(pipeRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch deployment records from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndDeployments();
  }, []);

  const openCreateModal = () => {
    setFormData({
      deploymentId: null,
      pipelineId: pipelines.length > 0 ? pipelines[0].pipelineId : '',
      environment: 'DEVELOPMENT',
      deployedBy: currentUser.userId || (users.length > 0 ? users[0].userId : ''),
      status: 'IN_PROGRESS'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (dep) => {
    setFormData({
      deploymentId: dep.deploymentId,
      pipelineId: dep.pipelineId || (pipelines.length > 0 ? pipelines[0].pipelineId : ''),
      environment: dep.environment || 'DEVELOPMENT',
      deployedBy: dep.deployedBy || (currentUser.userId || ''),
      status: dep.status || 'IN_PROGRESS'
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['pipelineId', 'deployedBy'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumericField && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pipelineId) {
      setError('Build pipeline association is required.');
      return;
    }
    if (!formData.deployedBy) {
      setError('Deployed By user is required.');
      return;
    }
    if (!formData.environment.trim()) {
      setError('Environment target is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/deployments/${formData.deploymentId}`, formData);
        setSuccessMsg('Deployment updated successfully.');
      } else {
        await api.post('/api/deployments', formData);
        setSuccessMsg('Deployment registered successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndDeployments();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save deployment profile.');
    }
  };

  const confirmDelete = (dep) => {
    setDeploymentToDelete(dep);
  };

  const handleDelete = async () => {
    if (!deploymentToDelete) return;
    try {
      await api.delete(`/api/deployments/${deploymentToDelete.deploymentId}`);
      setSuccessMsg('Deployment profile deleted successfully.');
      setDeploymentToDelete(null);
      fetchDependenciesAndDeployments();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete deployment.');
      setDeploymentToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredDeployments = deployments.filter((d) => {
    const userObj = users.find(u => u.userId === d.deployedBy);
    const userName = userObj ? userObj.fullName : '';
    const matchSearch =
      (d.environment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(d.deploymentId).includes(searchTerm);
    const matchEnv = envFilter === 'ALL' || (d.environment || '').toUpperCase() === envFilter.toUpperCase();
    const matchStatus = statusFilter === 'ALL' || (d.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchEnv && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDeployments.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDeployments = filteredDeployments.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Production & Staging Deployments</h2>
          <p className="text-secondary small mb-0">Monitor live environment deployments, execution status, and deployment history</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={pipelines.length === 0}
        >
          <i className="bi bi-cloud-upload fs-5"></i>
          <span>Trigger Deployment</span>
        </button>
      </div>

      {pipelines.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No build pipelines registered. Please create a Build Pipeline before registering a Deployment.
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
                placeholder="Search deployments by environment, user, or ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={envFilter}
              onChange={(e) => { setEnvFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Environments</option>
              <option value="DEVELOPMENT">DEVELOPMENT</option>
              <option value="STAGING">STAGING</option>
              <option value="PRODUCTION">PRODUCTION</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredDeployments.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading deployments registry...</p>
        </div>
      ) : filteredDeployments.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-cloud-check-fill display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Deployments Found</h4>
          <p className="text-secondary mb-4 small">Get started by logging your first staging/production release deployment.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={pipelines.length === 0}
          >
            Trigger Deployment
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
                    <th className="py-3 text-secondary">Pipeline Link</th>
                    <th className="py-3 text-secondary">Target Environment</th>
                    <th className="py-3 text-secondary">Deployed By</th>
                    <th className="py-3 text-secondary">Status</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDeployments.map((dep) => {
                    const pipelineObj = pipelines.find(p => p.pipelineId === dep.pipelineId);
                    const userObj = users.find(u => u.userId === dep.deployedBy);
                    return (
                      <tr key={dep.deploymentId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{dep.deploymentId}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {pipelineObj ? pipelineObj.pipelineName : `Pipeline #${dep.pipelineId}`}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            dep.environment === 'PRODUCTION' ? 'bg-danger text-light' :
                            dep.environment === 'STAGING' ? 'bg-warning text-dark' : 'bg-info text-dark'
                          }`}>
                            {dep.environment}
                          </span>
                        </td>
                        <td className="small text-light">
                          {userObj ? userObj.fullName : `User #${dep.deployedBy}`}
                        </td>
                        <td>
                          <span className={`badge ${
                            dep.status === 'SUCCESS' ? 'bg-success' :
                            dep.status === 'FAILED' ? 'bg-danger' : 'bg-primary'
                          }`}>
                            {dep.status}
                          </span>
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(dep)}
                            title="Edit Deployment"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(dep)}
                            title="Delete Deployment"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDeployments.length)} of {filteredDeployments.length} deployments
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
                  {isEditing ? 'Modify Deployment Profile' : 'Trigger Release Deployment'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Pipeline Link</label>
                    <select
                      name="pipelineId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.pipelineId}
                      onChange={handleInputChange}
                      required
                    >
                      {pipelines.map((p) => (
                        <option key={p.pipelineId} value={p.pipelineId}>
                          {p.pipelineName} (ID: #{p.pipelineId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Environment Target</label>
                      <select
                        name="environment"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.environment}
                        onChange={handleInputChange}
                      >
                        <option value="DEVELOPMENT">DEVELOPMENT</option>
                        <option value="STAGING">STAGING</option>
                        <option value="PRODUCTION">PRODUCTION</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Deployed By User</label>
                      <select
                        name="deployedBy"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.deployedBy}
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
                    <label className="form-label text-secondary small">Deployment Status</label>
                    <select
                      name="status"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Trigger Deployment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deploymentToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeploymentToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete deployment <strong>#{deploymentToDelete.deploymentId}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setDeploymentToDelete(null)}>
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

export default DeploymentsPage;

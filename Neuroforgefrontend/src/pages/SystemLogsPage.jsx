import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SystemLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [deploymentFilter, setDeploymentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    logId: null,
    deploymentId: '',
    logLevel: 'INFO',
    message: '',
    logTime: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const fetchDependenciesAndLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const [logRes, depRes] = await Promise.all([
        api.get('/api/system-logs'),
        api.get('/api/deployments')
      ]);
      setLogs(logRes.data || []);
      setDeployments(depRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch system audit logs from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndLogs();
  }, []);

  const openCreateModal = () => {
    setFormData({
      logId: null,
      deploymentId: deployments.length > 0 ? deployments[0].deploymentId : '',
      logLevel: 'INFO',
      message: '',
      logTime: new Date().toISOString().substring(0, 16) // YYYY-MM-DDTHH:MM
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (log) => {
    let formattedTime = '';
    if (log.logTime) {
      formattedTime = new Date(log.logTime).toISOString().substring(0, 16);
    }

    setFormData({
      logId: log.logId,
      deploymentId: log.deploymentId || (deployments.length > 0 ? deployments[0].deploymentId : ''),
      logLevel: log.logLevel || 'INFO',
      message: log.message || '',
      logTime: formattedTime
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'deploymentId' && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      setError('Log message is required.');
      return;
    }
    if (!formData.deploymentId) {
      setError('Deployment association is required.');
      return;
    }

    const payload = {
      ...formData,
      logTime: formData.logTime ? new Date(formData.logTime).toISOString() : new Date().toISOString()
    };

    try {
      if (isEditing) {
        await api.put(`/api/system-logs/${formData.logId}`, payload);
        setSuccessMsg('Log record updated successfully.');
      } else {
        await api.post('/api/system-logs', payload);
        setSuccessMsg('Log entry recorded successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndLogs();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save log record.');
    }
  };

  const confirmDelete = (log) => {
    setLogToDelete(log);
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    try {
      await api.delete(`/api/system-logs/${logToDelete.logId}`);
      setSuccessMsg('Log record deleted successfully.');
      setLogToDelete(null);
      fetchDependenciesAndLogs();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete log record.');
      setLogToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredLogs = logs.filter((l) => {
    const matchSearch =
      (l.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(l.logId).includes(searchTerm);
    const matchLevel = levelFilter === 'ALL' || (l.logLevel || '').toUpperCase() === levelFilter.toUpperCase();
    const matchDeployment = deploymentFilter === 'ALL' || l.deploymentId === parseInt(deploymentFilter, 10);
    return matchSearch && matchLevel && matchDeployment;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Audit & System Diagnostic Logs</h2>
          <p className="text-secondary small mb-0">Monitor application server events, build deployment executions, and runtime logs</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={deployments.length === 0}
        >
          <i className="bi bi-journal-plus fs-5"></i>
          <span>Log Event</span>
        </button>
      </div>

      {deployments.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active deployments registered. Please trigger a Deployment before adding System Logs.
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
                placeholder="Search log messages or log ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Log Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={deploymentFilter}
              onChange={(e) => { setDeploymentFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Deployments</option>
              {deployments.map(d => (
                <option key={d.deploymentId} value={d.deploymentId}>Deployment #{d.deploymentId} ({d.environment})</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredLogs.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading audit logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-journal-code display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No System Logs Found</h4>
          <p className="text-secondary mb-4 small">Diagnostic audit files are currently empty matching your criteria.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={deployments.length === 0}
          >
            Log Event
          </button>
        </div>
      ) : (
        <>
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden mb-4" style={{ backgroundColor: '#1e1e2d' }}>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0 small">
                <thead>
                  <tr className="border-bottom border-secondary border-opacity-25">
                    <th className="px-4 py-3 text-secondary">Log ID</th>
                    <th className="py-3 text-secondary">Deployment Link</th>
                    <th className="py-3 text-secondary">Log Level</th>
                    <th className="py-3 text-secondary">Log Message</th>
                    <th className="py-3 text-secondary">Log Time</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => {
                    const deployment = deployments.find(d => d.deploymentId === log.deploymentId);
                    return (
                      <tr key={log.logId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{log.logId}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {deployment ? `Deployment #${deployment.deploymentId} (${deployment.environment})` : `Deployment #${log.deploymentId}`}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            log.logLevel === 'ERROR' ? 'bg-danger' :
                            log.logLevel === 'WARN' ? 'bg-warning text-dark' : 'bg-info text-dark'
                          }`}>
                            {log.logLevel}
                          </span>
                        </td>
                        <td className="small text-light font-monospace">{log.message}</td>
                        <td className="small text-secondary">
                          {log.logTime ? new Date(log.logTime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(log)}
                            title="Edit Log"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(log)}
                            title="Delete Log"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length} logs
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
                  {isEditing ? 'Modify System Log Entry' : 'Create System Log Entry'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Deployment Link</label>
                    <select
                      name="deploymentId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.deploymentId}
                      onChange={handleInputChange}
                      required
                    >
                      {deployments.map((d) => (
                        <option key={d.deploymentId} value={d.deploymentId}>
                          Deployment ID: #{d.deploymentId} ({d.environment})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Log Level</label>
                    <select
                      name="logLevel"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.logLevel}
                      onChange={handleInputChange}
                    >
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Log Time</label>
                    <input
                      type="datetime-local"
                      name="logTime"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.logTime}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Log Message</label>
                    <textarea
                      name="message"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      rows="3"
                      placeholder="Type diagnostic message logs..."
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Create Log Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {logToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setLogToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete system log <strong>#{logToDelete.logId}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setLogToDelete(null)}>
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

export default SystemLogsPage;

import React, { useEffect, useState } from 'react';
import api from '../services/api';

const MetricsPage = () => {
  const [metrics, setMetrics] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    projectId: '',
    metricName: '',
    metricValue: '',
    recordedAt: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Store the original PK components for the item being edited
  const [originalPk, setOriginalPk] = useState({
    projectId: '',
    metricName: '',
    recordedAt: ''
  });
  const [metricToDelete, setMetricToDelete] = useState(null);

  const fetchMetricsAndProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, projRes] = await Promise.all([
        api.get('/api/metrics'),
        api.get('/api/projects')
      ]);
      setMetrics(metricsRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch platform metrics from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsAndProjects();
  }, []);

  const openCreateModal = () => {
    setFormData({
      projectId: projects.length > 0 ? projects[0].projectId : '',
      metricName: '',
      metricValue: '',
      recordedAt: new Date().toISOString().substring(0, 16) // YYYY-MM-DDTHH:MM
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (metric) => {
    let formattedDate = '';
    if (metric.recordedAt) {
      formattedDate = new Date(metric.recordedAt).toISOString().substring(0, 16);
    }

    const initialFormData = {
      projectId: metric.projectId,
      metricName: metric.metricName || '',
      metricValue: metric.metricValue || '',
      recordedAt: formattedDate
    };

    setFormData(initialFormData);
    setOriginalPk({
      projectId: metric.projectId,
      metricName: metric.metricName,
      recordedAt: metric.recordedAt
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
    if (!formData.metricName.trim()) {
      setError('Metric name is required.');
      return;
    }
    if (formData.metricValue === '') {
      setError('Metric value is required.');
      return;
    }

    const payload = {
      ...formData,
      metricValue: parseFloat(formData.metricValue),
      recordedAt: formData.recordedAt ? new Date(formData.recordedAt).toISOString() : new Date().toISOString()
    };

    try {
      if (isEditing) {
        const encodedName = encodeURIComponent(originalPk.metricName);
        const encodedRecordedAt = encodeURIComponent(originalPk.recordedAt);
        await api.put(`/api/metrics/${originalPk.projectId}/${encodedName}?recordedAt=${encodedRecordedAt}`, payload);
        setSuccessMsg('Metric updated successfully.');
      } else {
        await api.post('/api/metrics', payload);
        setSuccessMsg('Metric recorded successfully.');
      }
      setShowModal(false);
      fetchMetricsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save metric.');
    }
  };

  const confirmDelete = (metric) => {
    setMetricToDelete(metric);
  };

  const handleDelete = async () => {
    if (!metricToDelete) return;
    try {
      const encodedName = encodeURIComponent(metricToDelete.metricName);
      const encodedRecordedAt = encodeURIComponent(metricToDelete.recordedAt);
      await api.delete(`/api/metrics/${metricToDelete.projectId}/${encodedName}?recordedAt=${encodedRecordedAt}`);
      setSuccessMsg('Metric deleted successfully.');
      setMetricToDelete(null);
      fetchMetricsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete metric.');
      setMetricToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredMetrics = metrics.filter((m) => {
    const matchSearch = (m.metricName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || m.projectId === parseInt(projectFilter, 10);
    return matchSearch && matchProject;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMetrics.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMetrics = filteredMetrics.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">SDLC Platform Metrics</h2>
          <p className="text-secondary small mb-0">Track platform execution speeds, build success rates, and project performance KPIs</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={projects.length === 0}
        >
          <i className="bi bi-plus-lg fs-5"></i>
          <span>Record Metric</span>
        </button>
      </div>

      {projects.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active projects. Please create a Project before logging Metrics.
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
          <div className="col-12 col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-light rounded-end-3"
                placeholder="Search metrics by name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-8 col-md-4">
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
          <div className="col-4 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredMetrics.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading platform metrics...</p>
        </div>
      ) : filteredMetrics.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-bar-chart-line-fill display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Metrics Logged</h4>
          <p className="text-secondary mb-4 small">Record load speeds or testing failure rates to visualize SDLC health.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={projects.length === 0}
          >
            Record Metric
          </button>
        </div>
      ) : (
        <>
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden mb-4" style={{ backgroundColor: '#1e1e2d' }}>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0 small">
                <thead>
                  <tr className="border-bottom border-secondary border-opacity-25">
                    <th className="px-4 py-3 text-secondary">Project Link</th>
                    <th className="py-3 text-secondary">Metric Name</th>
                    <th className="py-3 text-secondary">Metric Value</th>
                    <th className="py-3 text-secondary">Recorded At</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMetrics.map((m, index) => {
                    const project = projects.find(p => p.projectId === m.projectId);
                    return (
                      <tr key={`${m.projectId}-${m.metricName}-${m.recordedAt}-${index}`} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4">
                          <span className="badge bg-secondary">
                            {project ? project.name : `Project #${m.projectId}`}
                          </span>
                        </td>
                        <td className="fw-bold text-light">{m.metricName}</td>
                        <td>
                          <span className="badge bg-info text-dark fw-semibold px-2.5 py-1.5">{m.metricValue}</span>
                        </td>
                        <td className="small text-secondary">
                          {m.recordedAt ? new Date(m.recordedAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(m)}
                            title="Edit Metric Value"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(m)}
                            title="Delete Metric"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMetrics.length)} of {filteredMetrics.length} metrics
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
                  {isEditing ? 'Modify Metric Value' : 'Log New Metric'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Project Association</label>
                    <select
                      name="projectId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.projectId}
                      onChange={handleInputChange}
                      required
                      disabled={isEditing}
                    >
                      {projects.map((p) => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Metric Name</label>
                    <input
                      type="text"
                      name="metricName"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.metricName}
                      onChange={handleInputChange}
                      required
                      disabled={isEditing}
                    />
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Metric Value</label>
                      <input
                        type="number"
                        step="any"
                        name="metricValue"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.metricValue}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Recorded At</label>
                      <input
                        type="datetime-local"
                        name="recordedAt"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.recordedAt}
                        onChange={handleInputChange}
                        required
                        disabled={isEditing}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Log Metric'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {metricToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMetricToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete metric <strong>{metricToDelete.metricName}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setMetricToDelete(null)}>
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

export default MetricsPage;

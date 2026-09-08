import React, { useEffect, useState } from 'react';
import api from '../services/api';

const BugsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [bugs, setBugs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [testcases, setTestcases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    bugId: null,
    taskId: '',
    testcaseId: '',
    assignedTo: '',
    title: '',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    status: 'NEW',
    resolution: '',
    createdAt: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bugToDelete, setBugToDelete] = useState(null);

  const fetchDependenciesAndBugs = async () => {
    setLoading(true);
    setError('');
    try {
      const [bugRes, taskRes, tcRes, userRes] = await Promise.all([
        api.get('/api/bugs'),
        api.get('/api/tasks'),
        api.get('/api/testcases'),
        api.get('/api/users')
      ]);
      setBugs(bugRes.data || []);
      setTasks(taskRes.data || []);
      setTestcases(tcRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch defect tracking records from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndBugs();
  }, []);

  const openCreateModal = () => {
    setFormData({
      bugId: null,
      taskId: '',
      testcaseId: '',
      assignedTo: '',
      title: '',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
      status: 'NEW',
      resolution: '',
      createdAt: new Date().toISOString()
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (bug) => {
    setFormData({
      bugId: bug.bugId,
      taskId: bug.taskId || '',
      testcaseId: bug.testcaseId || '',
      assignedTo: bug.assignedTo || '',
      title: bug.title || '',
      severity: bug.severity || 'MEDIUM',
      priority: bug.priority || 'MEDIUM',
      status: bug.status || 'NEW',
      resolution: bug.resolution || '',
      createdAt: bug.createdAt || new Date().toISOString()
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['taskId', 'testcaseId', 'assignedTo'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumericField && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Bug title is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/bugs/${formData.bugId}`, formData);
        setSuccessMsg('Bug profile updated successfully.');
      } else {
        await api.post('/api/bugs', formData);
        setSuccessMsg('Bug logged successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndBugs();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save bug.');
    }
  };

  const confirmDelete = (bug) => {
    setBugToDelete(bug);
  };

  const handleDelete = async () => {
    if (!bugToDelete) return;
    try {
      await api.delete(`/api/bugs/${bugToDelete.bugId}`);
      setSuccessMsg('Bug deleted successfully.');
      setBugToDelete(null);
      fetchDependenciesAndBugs();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete bug.');
      setBugToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredBugs = bugs.filter((b) => {
    const matchSearch =
      (b.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.resolution || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeverity = severityFilter === 'ALL' || (b.severity || '').toUpperCase() === severityFilter.toUpperCase();
    const matchStatus = statusFilter === 'ALL' || (b.status || '').toUpperCase() === statusFilter.toUpperCase();
    const matchUser = userFilter === 'ALL' || b.assignedTo === parseInt(userFilter, 10);
    return matchSearch && matchSeverity && matchStatus && matchUser;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBugs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBugs = filteredBugs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Defects & Bugs Tracker</h2>
          <p className="text-secondary small mb-0">Capture software defects, link to test cases & tasks, and drive issues to resolution</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
        >
          <i className="bi bi-bug fs-5"></i>
          <span>Log Bug</span>
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
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-light rounded-end-3"
                placeholder="Search bugs by title or resolution..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-4 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div className="col-4 col-md-2">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
          <div className="col-4 col-md-2">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Assignees</option>
              {users.map(u => (
                <option key={u.userId} value={u.userId}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-2 py-2 rounded-3 w-100 text-center">
              {filteredBugs.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading defects registry...</p>
        </div>
      ) : filteredBugs.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-bug-fill display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Bugs Found</h4>
          <p className="text-secondary mb-4 small">No defects logged matching your active criteria.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
          >
            Log Bug
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
                    <th className="py-3 text-secondary">Bug Title</th>
                    <th className="py-3 text-secondary">Severity</th>
                    <th className="py-3 text-secondary">Priority</th>
                    <th className="py-3 text-secondary">Status</th>
                    <th className="py-3 text-secondary">Assigned To</th>
                    <th className="py-3 text-secondary">Resolution</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBugs.map((bug) => {
                    const assigneeUser = users.find(u => u.userId === bug.assignedTo);
                    return (
                      <tr key={bug.bugId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{bug.bugId}</td>
                        <td className="fw-bold text-light">{bug.title}</td>
                        <td>
                          <span className={`badge ${
                            bug.severity === 'CRITICAL' ? 'bg-danger text-light fw-bold' :
                            bug.severity === 'HIGH' ? 'bg-danger' :
                            bug.severity === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-info text-dark'
                          }`}>
                            {bug.severity}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            bug.priority === 'HIGH' ? 'bg-danger' :
                            bug.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-secondary'
                          }`}>
                            {bug.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            bug.status === 'RESOLVED' || bug.status === 'CLOSED' ? 'bg-success' :
                            bug.status === 'ASSIGNED' ? 'bg-primary' : 'bg-secondary'
                          }`}>
                            {bug.status}
                          </span>
                        </td>
                        <td className="small text-light">
                          {assigneeUser ? assigneeUser.fullName : bug.assignedTo ? `User #${bug.assignedTo}` : 'Unassigned'}
                        </td>
                        <td className="small text-secondary">{bug.resolution || 'None'}</td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(bug)}
                            title="Edit Bug"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(bug)}
                            title="Delete Bug"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBugs.length)} of {filteredBugs.length} bugs
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
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-primary">
                  {isEditing ? 'Modify Bug Profile' : 'Log New Defect'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Bug Title / Summary</label>
                    <input
                      type="text"
                      name="title"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Associated Task</label>
                      <select
                        name="taskId"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.taskId}
                        onChange={handleInputChange}
                      >
                        <option value="">None</option>
                        {tasks.map((t) => (
                          <option key={t.taskId} value={t.taskId}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Associated Test Case</label>
                      <select
                        name="testcaseId"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.testcaseId}
                        onChange={handleInputChange}
                      >
                        <option value="">None</option>
                        {testcases.map((tc) => (
                          <option key={tc.testcaseId} value={tc.testcaseId}>
                            Test Case #{tc.testcaseId}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Assigned Developer</label>
                      <select
                        name="assignedTo"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.assignedTo}
                        onChange={handleInputChange}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Resolution Notes</label>
                      <input
                        type="text"
                        name="resolution"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        placeholder="e.g. Fixed in v1.1.2, Cannot Reproduce"
                        value={formData.resolution}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-4">
                      <label className="form-label text-secondary small">Severity</label>
                      <select
                        name="severity"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.severity}
                        onChange={handleInputChange}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label text-secondary small">Priority</label>
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
                    <div className="col-4">
                      <label className="form-label text-secondary small">Bug Status</label>
                      <select
                        name="status"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="NEW">NEW</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Log Bug'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {bugToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setBugToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete bug <strong>{bugToDelete.title}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setBugToDelete(null)}>
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

export default BugsPage;

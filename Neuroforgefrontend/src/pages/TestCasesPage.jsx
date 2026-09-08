import React, { useEffect, useState } from 'react';
import api from '../services/api';

const TestCasesPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [testcases, setTestcases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    testcaseId: null,
    taskId: '',
    expectedResult: '',
    actualResult: '',
    status: 'UNTESTED'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [testcaseToDelete, setTestcaseToDelete] = useState(null);

  const fetchTestCasesAndTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const [tcRes, taskRes] = await Promise.all([
        api.get('/api/testcases'),
        api.get('/api/tasks')
      ]);
      setTestcases(tcRes.data || []);
      setTasks(taskRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch test cases from the backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCasesAndTasks();
  }, []);

  const openCreateModal = () => {
    setFormData({
      testcaseId: null,
      taskId: tasks.length > 0 ? tasks[0].taskId : '',
      expectedResult: '',
      actualResult: '',
      status: 'UNTESTED'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (tc) => {
    setFormData({
      testcaseId: tc.testcaseId,
      taskId: tc.taskId || (tasks.length > 0 ? tasks[0].taskId : ''),
      expectedResult: tc.expectedResult || '',
      actualResult: tc.actualResult || '',
      status: tc.status || 'UNTESTED'
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'taskId' && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taskId) {
      setError('Task association is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/testcases/${formData.testcaseId}`, formData);
        setSuccessMsg('Test case updated successfully.');
      } else {
        await api.post('/api/testcases', formData);
        setSuccessMsg('Test case created successfully.');
      }
      setShowModal(false);
      fetchTestCasesAndTasks();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save testcase.');
    }
  };

  const confirmDelete = (tc) => {
    setTestcaseToDelete(tc);
  };

  const handleDelete = async () => {
    if (!testcaseToDelete) return;
    try {
      await api.delete(`/api/testcases/${testcaseToDelete.testcaseId}`);
      setSuccessMsg('Test case deleted successfully.');
      setTestcaseToDelete(null);
      fetchTestCasesAndTasks();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete testcase.');
      setTestcaseToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredTestcases = testcases.filter((tc) => {
    const matchSearch =
      (tc.expectedResult || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tc.actualResult || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTask = taskFilter === 'ALL' || tc.taskId === parseInt(taskFilter, 10);
    const matchStatus = statusFilter === 'ALL' || (tc.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchTask && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTestcases.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTestcases = filteredTestcases.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Quality Assurance - Test Cases Repository</h2>
          <p className="text-secondary small mb-0">Define expected test results, verify actual outcomes, and link test specs to task work items</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={tasks.length === 0}
        >
          <i className="bi bi-plus-lg fs-5"></i>
          <span>New Test Case</span>
        </button>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active tasks registered. Please create a Task before defining a Test Case.
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
                placeholder="Search by expected or actual results..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={taskFilter}
              onChange={(e) => { setTaskFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Associated Tasks</option>
              {tasks.map(t => (
                <option key={t.taskId} value={t.taskId}>{t.title}</option>
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
              <option value="UNTESTED">UNTESTED</option>
              <option value="PASSED">PASSED</option>
              <option value="FAILED">FAILED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredTestcases.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading test cases repository...</p>
        </div>
      ) : filteredTestcases.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-shield-x display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Test Cases Found</h4>
          <p className="text-secondary mb-4 small">Get started by creating your first QA test verification case.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={tasks.length === 0}
          >
            Create Test Case
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
                    <th className="py-3 text-secondary">Associated Task</th>
                    <th className="py-3 text-secondary">Expected Result</th>
                    <th className="py-3 text-secondary">Actual Result</th>
                    <th className="py-3 text-secondary">Test Status</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTestcases.map((tc) => {
                    const task = tasks.find(t => t.taskId === tc.taskId);
                    return (
                      <tr key={tc.testcaseId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{tc.testcaseId}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {task ? task.title : `Task #${tc.taskId}`}
                          </span>
                        </td>
                        <td className="small text-light">{tc.expectedResult || 'N/A'}</td>
                        <td className="small text-secondary">{tc.actualResult || 'N/A'}</td>
                        <td>
                          <span className={`badge ${
                            tc.status === 'PASSED' ? 'bg-success' :
                            tc.status === 'FAILED' ? 'bg-danger' :
                            tc.status === 'BLOCKED' ? 'bg-warning text-dark' : 'bg-secondary'
                          }`}>
                            {tc.status}
                          </span>
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(tc)}
                            title="Edit Test Case"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(tc)}
                            title="Delete Test Case"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTestcases.length)} of {filteredTestcases.length} test cases
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
                  {isEditing ? 'Modify Test Case Spec' : 'Define New Test Case'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Task Association</label>
                    <select
                      name="taskId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.taskId}
                      onChange={handleInputChange}
                      required
                    >
                      {tasks.map((t) => (
                        <option key={t.taskId} value={t.taskId}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Expected Result Spec</label>
                    <textarea
                      name="expectedResult"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      rows="2"
                      value={formData.expectedResult}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Actual Result (Recorded Outcome)</label>
                    <textarea
                      name="actualResult"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      rows="2"
                      value={formData.actualResult}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Test Execution Status</label>
                    <select
                      name="status"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="UNTESTED">UNTESTED</option>
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn-close-white btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Create Test Case'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {testcaseToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTestcaseToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this test case?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setTestcaseToDelete(null)}>
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

export default TestCasesPage;

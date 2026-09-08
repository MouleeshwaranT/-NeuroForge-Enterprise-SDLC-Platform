import React, { useEffect, useState } from 'react';
import api from '../services/api';

const TestRunsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [testruns, setTestruns] = useState([]);
  const [testcases, setTestcases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [testcaseFilter, setTestcaseFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    testRunId: null,
    testcaseId: '',
    executedBy: '',
    executionDate: '',
    result: 'PASSED'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [testrunToDelete, setTestrunToDelete] = useState(null);

  const fetchDependenciesAndTestRuns = async () => {
    setLoading(true);
    setError('');
    try {
      const [trRes, tcRes, userRes] = await Promise.all([
        api.get('/api/test-runs'),
        api.get('/api/testcases'),
        api.get('/api/users')
      ]);
      setTestruns(trRes.data || []);
      setTestcases(tcRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch test runs execution records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndTestRuns();
  }, []);

  const openCreateModal = () => {
    setFormData({
      testRunId: null,
      testcaseId: testcases.length > 0 ? testcases[0].testcaseId : '',
      executedBy: currentUser.userId || (users.length > 0 ? users[0].userId : ''),
      executionDate: new Date().toISOString().substring(0, 16),
      result: 'PASSED'
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (tr) => {
    let formattedDate = '';
    if (tr.executionDate) {
      formattedDate = new Date(tr.executionDate).toISOString().substring(0, 16);
    }

    setFormData({
      testRunId: tr.testRunId,
      testcaseId: tr.testcaseId || (testcases.length > 0 ? testcases[0].testcaseId : ''),
      executedBy: tr.executedBy || (users.length > 0 ? users[0].userId : ''),
      executionDate: formattedDate,
      result: tr.result || 'PASSED'
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['testcaseId', 'executedBy'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumericField && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.testcaseId) {
      setError('Test Case association is required.');
      return;
    }
    if (!formData.executedBy) {
      setError('Executed By user is required.');
      return;
    }

    const submitData = {
      ...formData,
      executionDate: formData.executionDate ? new Date(formData.executionDate).toISOString() : null
    };

    try {
      if (isEditing) {
        await api.put(`/api/test-runs/${formData.testRunId}`, submitData);
        setSuccessMsg('Test run updated successfully.');
      } else {
        await api.post('/api/test-runs', submitData);
        setSuccessMsg('Test run logged successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndTestRuns();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save test run.');
    }
  };

  const confirmDelete = (tr) => {
    setTestrunToDelete(tr);
  };

  const handleDelete = async () => {
    if (!testrunToDelete) return;
    try {
      await api.delete(`/api/test-runs/${testrunToDelete.testRunId}`);
      setSuccessMsg('Test run deleted successfully.');
      setTestrunToDelete(null);
      fetchDependenciesAndTestRuns();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete test run.');
      setTestrunToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredTestruns = testruns.filter((tr) => {
    const execUser = users.find(u => u.userId === tr.executedBy);
    const userName = execUser ? execUser.fullName : '';
    const matchSearch =
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(tr.testRunId).includes(searchTerm) ||
      String(tr.testcaseId).includes(searchTerm);
    const matchResult = resultFilter === 'ALL' || (tr.result || '').toUpperCase() === resultFilter.toUpperCase();
    const matchTc = testcaseFilter === 'ALL' || tr.testcaseId === parseInt(testcaseFilter, 10);
    return matchSearch && matchResult && matchTc;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTestruns.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTestruns = filteredTestruns.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Quality Assurance - Test Runs Execution</h2>
          <p className="text-secondary small mb-0">Record test execution results, monitor QA runs, and audit verification history</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={testcases.length === 0}
        >
          <i className="bi bi-plus-lg fs-5"></i>
          <span>New Test Run</span>
        </button>
      </div>

      {testcases.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No test cases registered. Please create a Test Case before executing a Test Run.
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
                placeholder="Search by tester name or test run ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={testcaseFilter}
              onChange={(e) => { setTestcaseFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Test Cases</option>
              {testcases.map(tc => (
                <option key={tc.testcaseId} value={tc.testcaseId}>Test Case #{tc.testcaseId}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={resultFilter}
              onChange={(e) => { setResultFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Results</option>
              <option value="PASSED">PASSED</option>
              <option value="FAILED">FAILED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredTestruns.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading test execution runs...</p>
        </div>
      ) : filteredTestruns.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-play-circle display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Test Runs Found</h4>
          <p className="text-secondary mb-4 small">Get started by logging your first test execution cycle.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={testcases.length === 0}
          >
            Create Test Run
          </button>
        </div>
      ) : (
        <>
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden mb-4" style={{ backgroundColor: '#1e1e2d' }}>
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0 small">
                <thead>
                  <tr className="border-bottom border-secondary border-opacity-25">
                    <th className="px-4 py-3 text-secondary">Run ID</th>
                    <th className="py-3 text-secondary">Test Case</th>
                    <th className="py-3 text-secondary">Executed By</th>
                    <th className="py-3 text-secondary">Execution Date & Time</th>
                    <th className="py-3 text-secondary">Result</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTestruns.map((tr) => {
                    const execUser = users.find(u => u.userId === tr.executedBy);
                    return (
                      <tr key={tr.testRunId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{tr.testRunId}</td>
                        <td>
                          <span className="badge bg-secondary">
                            Test Case #{tr.testcaseId}
                          </span>
                        </td>
                        <td className="small text-light">
                          {execUser ? execUser.fullName : `User #${tr.executedBy}`}
                        </td>
                        <td className="small text-secondary">
                          {tr.executionDate ? new Date(tr.executionDate).toLocaleString() : 'N/A'}
                        </td>
                        <td>
                          <span className={`badge ${
                            tr.result === 'PASSED' ? 'bg-success' :
                            tr.result === 'FAILED' ? 'bg-danger' : 'bg-warning text-dark'
                          }`}>
                            {tr.result}
                          </span>
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(tr)}
                            title="Edit Test Run"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(tr)}
                            title="Delete Test Run"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTestruns.length)} of {filteredTestruns.length} test runs
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
                  {isEditing ? 'Modify Test Run Record' : 'Log Test Execution Run'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Test Case Spec Link</label>
                    <select
                      name="testcaseId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.testcaseId}
                      onChange={handleInputChange}
                      required
                    >
                      {testcases.map((tc) => (
                        <option key={tc.testcaseId} value={tc.testcaseId}>
                          Test Case #{tc.testcaseId} (Task #{tc.taskId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Executed By Tester</label>
                    <select
                      name="executedBy"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.executedBy}
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
                  <div className="row">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Execution Timestamp</label>
                      <input
                        type="datetime-local"
                        name="executionDate"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.executionDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Result Status</label>
                      <select
                        name="result"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.result}
                        onChange={handleInputChange}
                      >
                        <option value="PASSED">PASSED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="BLOCKED">BLOCKED</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Record Test Run'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {testrunToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTestrunToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete test run <strong>#{testrunToDelete.testRunId}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setTestrunToDelete(null)}>
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

export default TestRunsPage;

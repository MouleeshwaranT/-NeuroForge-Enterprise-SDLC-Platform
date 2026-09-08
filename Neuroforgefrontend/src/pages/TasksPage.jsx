import React, { useEffect, useState } from 'react';
import api from '../services/api';

const TasksPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toUpperCase();

  const isAdmin = userRole.includes('ADMIN');
  const isPM = userRole.includes('PROJECT_MANAGER') || userRole.includes('MANAGER');
  const canCreateTask = isAdmin || isPM;
  const canAssignTasks = isAdmin || isPM;

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [users, setUsers] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    taskId: null,
    title: '',
    description: '',
    projectId: '',
    sprintId: '',
    requirementId: '',
    assignedTo: '',
    createdBy: currentUser.userId || '',
    priority: 'MEDIUM',
    status: 'TODO',
    startDate: '',
    dueDate: '',
    comments: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const fetchDependenciesAndTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const [taskRes, projRes, sprintRes, reqRes, userRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/projects'),
        api.get('/api/sprints'),
        api.get('/api/requirements'),
        api.get('/api/users')
      ]);
      setTasks(taskRes.data || []);
      setProjects(projRes.data || []);
      setSprints(sprintRes.data || []);
      setRequirements(reqRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tasks and workspace dependencies from the backend.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleMembers = async (projId) => {
    if (!projId) {
      setEligibleMembers([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const res = await api.get(`/api/projects/${projId}/members`);
      setEligibleMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load project members:', err);
      setEligibleMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndTasks();
  }, []);

  const openCreateModal = () => {
    const defaultProjectId = projects.length > 0 ? projects[0].projectId : '';
    setFormData({
      taskId: null,
      title: '',
      description: '',
      projectId: defaultProjectId,
      sprintId: '',
      requirementId: '',
      assignedTo: '',
      createdBy: currentUser.userId || '',
      priority: 'MEDIUM',
      status: 'TODO',
      startDate: '',
      dueDate: '',
      comments: ''
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
    if (defaultProjectId) {
      fetchEligibleMembers(defaultProjectId);
    }
  };

  const openEditModal = (task) => {
    const pId = task.projectId || (projects.length > 0 ? projects[0].projectId : '');
    setFormData({
      taskId: task.taskId,
      title: task.title || '',
      description: task.description || '',
      projectId: pId,
      sprintId: task.sprintId || '',
      requirementId: task.requirementId || '',
      assignedTo: task.assignedTo !== null && task.assignedTo !== undefined ? task.assignedTo : '',
      createdBy: task.createdBy || (currentUser.userId || ''),
      priority: task.priority || 'MEDIUM',
      status: task.status || 'TODO',
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      comments: task.comments || ''
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
    if (pId) {
      fetchEligibleMembers(pId);
    } else {
      setEligibleMembers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['projectId', 'sprintId', 'requirementId', 'assignedTo', 'createdBy'].includes(name);
    const parsedValue = isNumericField && value !== '' ? parseInt(value, 10) : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: parsedValue };
      if (name === 'projectId') {
        updated.assignedTo = '';
        updated.sprintId = '';
        updated.requirementId = '';
        if (parsedValue) {
          fetchEligibleMembers(parsedValue);
        } else {
          setEligibleMembers([]);
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Valid project association is required.');
      return;
    }
    if (formData.startDate && formData.dueDate && new Date(formData.startDate) > new Date(formData.dueDate)) {
      setError('Task due date cannot be before start date.');
      return;
    }

    const payload = {
      ...formData,
      projectId: formData.projectId ? Number(formData.projectId) : null,
      sprintId: formData.sprintId ? Number(formData.sprintId) : null,
      requirementId: formData.requirementId ? Number(formData.requirementId) : null,
      assignedTo: formData.assignedTo !== '' && formData.assignedTo !== null && formData.assignedTo !== undefined ? Number(formData.assignedTo) : null,
      createdBy: currentUser.userId ? Number(currentUser.userId) : (formData.createdBy ? Number(formData.createdBy) : null),
      startDate: formData.startDate || null,
      dueDate: formData.dueDate || null,
    };

    try {
      if (isEditing) {
        await api.put(`/api/tasks/${formData.taskId}`, payload);
        setSuccessMsg('Task updated successfully.');
      } else {
        await api.post('/api/tasks', payload);
        setSuccessMsg('Task created and tracked successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndTasks();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : null);
      setError(backendMsg || err.message || 'Failed to save task.');
    }
  };

  const handleStatusTransition = async (task, newStatus, customComment = null) => {
    setError('');
    let commentText = customComment !== null ? customComment : (task.comments || '');

    if (newStatus === 'BLOCKED' && !commentText.trim()) {
      const reason = prompt('Please enter the reason for blocking this task:');
      if (!reason || !reason.trim()) {
        setError('A comment/reason is required to block a task.');
        return;
      }
      commentText = reason.trim();
    }

    try {
      await api.put(`/api/tasks/${task.taskId}`, {
        ...task,
        status: newStatus,
        comments: commentText
      });
      setSuccessMsg(`Task "${task.title}" status updated to ${newStatus}.`);
      fetchDependenciesAndTasks();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : null);
      setError(backendMsg || err.message || 'Failed to update task status.');
    }
  };

  const confirmDelete = (task) => {
    setTaskToDelete(task);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/api/tasks/${taskToDelete.taskId}`);
      setSuccessMsg('Task deleted successfully.');
      setTaskToDelete(null);
      fetchDependenciesAndTasks();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response.data : null);
      setError(backendMsg || err.message || 'Failed to delete task.');
      setTaskToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || t.projectId === parseInt(projectFilter, 10);
    const matchStatus = statusFilter === 'ALL' || (t.status || '').toUpperCase() === statusFilter.toUpperCase();
    const matchUser = userFilter === 'ALL' || (t.assignedTo !== null && t.assignedTo !== undefined && String(t.assignedTo) === String(userFilter));
    return matchSearch && matchProject && matchStatus && matchUser;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  // Available Sprints and Requirements for selected Project
  const selectedProjectSprints = sprints.filter(s => !formData.projectId || s.projectId === formData.projectId);
  const selectedProjectRequirements = requirements.filter(r => !formData.projectId || r.projectId === formData.projectId);

  const renderStatusBadge = (statusStr) => {
    const s = (statusStr || 'TODO').toUpperCase();
    switch (s) {
      case 'TODO':
        return <span className="badge bg-secondary px-2.5 py-1">TODO</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-primary px-2.5 py-1">IN_PROGRESS</span>;
      case 'IN_REVIEW':
        return <span className="badge bg-warning text-dark px-2.5 py-1">IN_REVIEW</span>;
      case 'BLOCKED':
        return <span className="badge bg-danger px-2.5 py-1">BLOCKED</span>;
      case 'CHANGES_REQUESTED':
        return <span className="badge bg-info text-dark px-2.5 py-1">CHANGES_REQUESTED</span>;
      case 'COMPLETED':
        return <span className="badge bg-success px-2.5 py-1">COMPLETED</span>;
      default:
        return <span className="badge bg-secondary px-2.5 py-1">{s}</span>;
    }
  };

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Enterprise SDLC Work Tasks Tracker</h2>
          <p className="text-secondary small mb-0">Track project work items, control lifecycle state transitions, and assign eligible project team members</p>
        </div>
        {canCreateTask && (
          <button 
            className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2 shadow-sm" 
            onClick={openCreateModal}
            disabled={projects.length === 0}
          >
            <i className="bi bi-plus-lg fs-5"></i>
            <span>New Task</span>
          </button>
        )}
      </div>

      {projects.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No active projects registered. Please create a Project before creating Tasks.
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
          <div className="col-12 col-md-3">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-light rounded-end-3"
                placeholder="Search by title or description..."
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
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
          <div className="col-8 col-md-2">
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
          <div className="col-4 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-2 py-2 rounded-3 w-100 text-center">
              {filteredTasks.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading tasks tracker...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-list-task display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Tasks Found</h4>
          <p className="text-secondary mb-4 small">Create work items and assign them to your team members.</p>
          {canCreateTask && (
            <button 
              className="btn btn-primary mx-auto rounded-3 px-4" 
              onClick={openCreateModal}
              disabled={projects.length === 0}
            >
              Create Task
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
                    <th className="py-3 text-secondary">Task Title</th>
                    <th className="py-3 text-secondary">Project / Sprint</th>
                    <th className="py-3 text-secondary">Assigned To</th>
                    <th className="py-3 text-secondary">Priority</th>
                    <th className="py-3 text-secondary">Status</th>
                    <th className="py-3 text-secondary">Dates</th>
                    <th className="px-4 py-3 text-end text-secondary">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTasks.map((task) => {
                    const proj = projects.find(p => p.projectId === task.projectId);
                    const spr = sprints.find(s => s.sprintId === task.sprintId);
                    const user = users.find(u => String(u.userId) === String(task.assignedTo));
                    const statusKey = (task.status || 'TODO').toUpperCase();

                    const isAssignedToCurrentUser = currentUser.userId && task.assignedTo && String(task.assignedTo) === String(currentUser.userId);
                    const canPerformExecution = canAssignTasks || isAssignedToCurrentUser;
                    const canEdit = canAssignTasks || isAssignedToCurrentUser;

                    return (
                      <tr key={task.taskId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{task.taskId}</td>
                        <td>
                          <div className="fw-bold text-light">{task.title}</div>
                          <div className="text-secondary extra-small text-truncate" style={{ maxWidth: '220px' }}>
                            {task.description || 'No description'}
                          </div>
                          {task.comments && (
                            <div className="text-warning extra-small mt-0.5 text-truncate" style={{ maxWidth: '220px', fontSize: '0.72rem' }}>
                              <i className="bi bi-chat-left-text me-1"></i>{task.comments}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="badge bg-secondary mb-1 d-block text-truncate" style={{ maxWidth: '140px' }}>
                            {proj ? proj.name : `Proj #${task.projectId}`}
                          </div>
                          <div className="text-secondary extra-small">
                            {spr ? spr.sprintName : task.sprintId ? `Sprint #${task.sprintId}` : 'Backlog'}
                          </div>
                        </td>
                        <td className="small text-light">
                          {user ? user.fullName : task.assignedTo ? `User #${task.assignedTo}` : <span className="text-secondary fst-italic">Unassigned</span>}
                        </td>
                        <td>
                          <span className={`badge ${
                            task.priority === 'HIGH' ? 'bg-danger' :
                            task.priority === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-info text-dark'
                          }`}>
                            {task.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td>
                          {renderStatusBadge(task.status)}
                        </td>
                        <td className="extra-small text-secondary" style={{ fontSize: '0.75rem' }}>
                          <div>Start: {task.startDate || '—'}</div>
                          <div>Due: {task.dueDate || '—'}</div>
                        </td>
                        <td className="px-4 text-end">
                          <div className="d-inline-flex gap-1 align-items-center">
                            {/* Workflow Transitions */}
                            {canPerformExecution && statusKey === 'TODO' && (
                              <button
                                className="btn btn-sm btn-outline-primary rounded-2 px-2 py-1 extra-small"
                                title="Start Progress"
                                onClick={() => handleStatusTransition(task, 'IN_PROGRESS')}
                              >
                                <i className="bi bi-play-fill me-1"></i>Start
                              </button>
                            )}

                            {canPerformExecution && statusKey === 'IN_PROGRESS' && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-warning rounded-2 px-2 py-1 extra-small"
                                  title="Submit for Review"
                                  onClick={() => handleStatusTransition(task, 'IN_REVIEW')}
                                >
                                  <i className="bi bi-send-check me-1"></i>Review
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger rounded-2 px-2 py-1 extra-small"
                                  title="Block Task"
                                  onClick={() => handleStatusTransition(task, 'BLOCKED')}
                                >
                                  <i className="bi bi-slash-circle me-1"></i>Block
                                </button>
                              </>
                            )}

                            {canPerformExecution && statusKey === 'BLOCKED' && (
                              <button
                                className="btn btn-sm btn-outline-success rounded-2 px-2 py-1 extra-small"
                                title="Resume Work"
                                onClick={() => handleStatusTransition(task, 'IN_PROGRESS')}
                              >
                                <i className="bi bi-arrow-counterclockwise me-1"></i>Resume
                              </button>
                            )}

                            {canAssignTasks && statusKey === 'IN_REVIEW' && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-success rounded-2 px-2 py-1 extra-small"
                                  title="Approve & Complete"
                                  onClick={() => handleStatusTransition(task, 'COMPLETED')}
                                >
                                  <i className="bi bi-check-circle-fill me-1"></i>Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger rounded-2 px-2 py-1 extra-small"
                                  title="Request Changes"
                                  onClick={() => handleStatusTransition(task, 'CHANGES_REQUESTED')}
                                >
                                  <i className="bi bi-arrow-return-left me-1"></i>Reject
                                </button>
                              </>
                            )}

                            {canPerformExecution && statusKey === 'CHANGES_REQUESTED' && (
                              <button
                                className="btn btn-sm btn-outline-primary rounded-2 px-2 py-1 extra-small"
                                title="Restart Rework"
                                onClick={() => handleStatusTransition(task, 'IN_PROGRESS')}
                              >
                                <i className="bi bi-tools me-1"></i>Rework
                              </button>
                            )}

                            {/* Edit & Delete */}
                            {canEdit && (
                              <button
                                className="btn btn-sm btn-outline-info rounded-2 px-2 py-1 extra-small"
                                onClick={() => openEditModal(task)}
                                title="Edit Task Details"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                            )}

                            {canAssignTasks && (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-2 px-2 py-1 extra-small"
                                onClick={() => confirmDelete(task)}
                                title="Delete Task"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}

                            {!canEdit && !canAssignTasks && (
                              <span className="badge bg-dark text-secondary border border-secondary border-opacity-25 px-2 py-1 extra-small">
                                <i className="bi bi-eye me-1"></i>View Only
                              </span>
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTasks.length)} of {filteredTasks.length} tasks
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
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4 shadow-lg">
              <div className="modal-header border-secondary border-opacity-25 px-4 py-3">
                <h5 className="modal-title fw-bold text-light fs-5 mb-0">
                  {isEditing ? 'Modify Task SDLC Parameters' : 'Track New Task Work Item'}
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

                  {/* Title */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">
                      Task Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      placeholder="e.g. Implement JWT Refresh Token Strategy"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">Description</label>
                    <textarea
                      name="description"
                      className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      rows="2"
                      placeholder="Provide acceptance criteria and work item description..."
                      value={formData.description}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>

                  {/* Project, Sprint, Requirement Links */}
                  <div className="row mb-3 g-3">
                    <div className="col-4">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">
                        Project Association <span className="text-danger">*</span>
                      </label>
                      <select
                        name="projectId"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.projectId}
                        onChange={handleInputChange}
                        required
                        disabled={!canAssignTasks && isEditing}
                      >
                        {projects.map((p) => (
                          <option key={p.projectId} value={p.projectId}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Sprint Association</label>
                      <select
                        name="sprintId"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.sprintId}
                        onChange={handleInputChange}
                      >
                        <option value="">None (Backlog)</option>
                        {selectedProjectSprints.map((s) => (
                          <option key={s.sprintId} value={s.sprintId}>
                            {s.sprintName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Requirement Link</label>
                      <select
                        name="requirementId"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.requirementId}
                        onChange={handleInputChange}
                      >
                        <option value="">None</option>
                        {selectedProjectRequirements.map((r) => (
                          <option key={r.requirementId} value={r.requirementId}>
                            {r.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Assigned To & Created By */}
                  <div className="row mb-3 g-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">
                        Assigned To {!canAssignTasks && <span className="text-warning extra-small">(PM/Admin Only)</span>}
                      </label>
                      <select
                        name="assignedTo"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.assignedTo}
                        onChange={handleInputChange}
                        disabled={!canAssignTasks || !formData.projectId || loadingMembers}
                      >
                        {!formData.projectId ? (
                          <option value="">Select Project First</option>
                        ) : loadingMembers ? (
                          <option value="">Loading eligible members...</option>
                        ) : eligibleMembers.length === 0 ? (
                          <option value="">No eligible members found</option>
                        ) : (
                          <>
                            <option value="">Unassigned</option>
                            {eligibleMembers.map((u) => (
                              <option key={u.userId} value={u.userId}>
                                {u.fullName} ({u.role ? u.role.replace('ROLE_', '') : 'Member'})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {formData.projectId && !loadingMembers && eligibleMembers.length === 0 && (
                        <div className="text-warning extra-small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-exclamation-triangle-fill"></i>
                          <span>No eligible project members found. Add members to a team in this project.</span>
                        </div>
                      )}
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Created By</label>
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small opacity-75"
                        value={currentUser.fullName || currentUser.email || (currentUser.userId ? `User #${currentUser.userId}` : 'Logged-in User')}
                        disabled
                        readOnly
                      />
                      <span className="text-secondary extra-small" style={{ fontSize: '0.75rem' }}>
                        Automatically set to logged-in user
                      </span>
                    </div>
                  </div>

                  {/* Priority, Status, Start Date, Due Date */}
                  <div className="row mb-3 g-3">
                    <div className="col-3">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Priority</label>
                      <select
                        name="priority"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.priority}
                        onChange={handleInputChange}
                        disabled={!canAssignTasks && isEditing}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Status</label>
                      <select
                        name="status"
                        className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="IN_REVIEW">IN_REVIEW</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.startDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-3">
                      <label className="form-label text-secondary small fw-semibold mb-1.5">Due Date</label>
                      <input
                        type="date"
                        name="dueDate"
                        className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        disabled={!canAssignTasks && isEditing}
                      />
                    </div>
                  </div>

                  {/* Comments / Work Notes / Blocked Reason */}
                  <div>
                    <label className="form-label text-secondary small fw-semibold mb-1.5">
                      Comments / Work Notes / Blocked Reason
                    </label>
                    <textarea
                      name="comments"
                      className="form-control bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      rows="2"
                      placeholder="Add work notes, progress updates, or reason if task is blocked..."
                      value={formData.comments}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between">
                  <button type="button" className="btn btn-outline-secondary rounded-3 px-4 py-2 small fw-semibold" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 py-2 small fw-semibold shadow-sm">
                    {isEditing ? 'Save Changes' : 'Track Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {taskToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4 shadow-lg">
              <div className="modal-header border-secondary border-opacity-25 px-4 py-3">
                <h5 className="modal-title fw-bold text-danger fs-5 mb-0">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTaskToDelete(null)}></button>
              </div>
              <div className="modal-body px-4 py-3">
                <p className="mb-2">Are you sure you want to delete task <strong>{taskToDelete.title}</strong>?</p>
                <p className="text-secondary extra-small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between">
                <button type="button" className="btn btn-outline-secondary rounded-3 px-3 py-1.5 small" onClick={() => setTaskToDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger rounded-3 px-3 py-1.5 small shadow-sm" onClick={handleDelete}>
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

export default TasksPage;

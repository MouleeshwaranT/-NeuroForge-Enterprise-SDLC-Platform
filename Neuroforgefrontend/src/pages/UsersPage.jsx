import React, { useEffect, useState } from 'react';
import api from '../services/api';

const UsersPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'ROLE_ADMIN' || (currentUser.role && currentUser.role.toUpperCase().includes('ADMIN'));

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    userId: null,
    fullName: '',
    email: '',
    passwordHash: '',
    role: 'ROLE_DEVELOPER',
    status: 'ACTIVE',
    phone: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await api.get('/api/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error(err);
      if (!silent) setError('Failed to load user directory from backend service.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setFormData({
      userId: null,
      fullName: '',
      email: '',
      passwordHash: '',
      role: 'ROLE_DEVELOPER',
      status: 'INVITED',
      phone: ''
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setFormData({
      userId: user.userId,
      fullName: user.fullName || '',
      email: user.email || '',
      passwordHash: '',
      role: user.role || 'ROLE_DEVELOPER',
      status: user.status || 'ACTIVE',
      phone: user.phone || ''
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    const roleFormatted = formData.role.startsWith('ROLE_') ? formData.role : 'ROLE_' + formData.role;

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      role: roleFormatted,
      status: formData.status,
      phone: formData.phone
    };

    if (isEditing) {
      payload.userId = formData.userId;
      if (formData.passwordHash.trim()) {
        payload.passwordHash = formData.passwordHash;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        const response = await api.put(`/api/users/${formData.userId}`, payload);
        const updated = response.data;
        if (updated) {
          setUsers(prev => prev.map(u => u.userId === updated.userId ? updated : u));
        }
        setSuccessMsg('User profile updated successfully.');
        setError('');
        setShowModal(false);
      } else {
        const response = await api.post('/api/users', payload);
        const data = response.data;
        const newUser = data?.user;

        if (newUser) {
          setUsers(prev => [newUser, ...prev.filter(u => u.userId !== newUser.userId)]);
        }

        if (data && data.emailSent) {
          setSuccessMsg('User added successfully. Invitation email sent.');
          setError('');
        } else {
          setSuccessMsg('User added successfully, but the invitation email could not be sent. You can resend the invitation.');
          setError('');
        }
        setShowModal(false);
      }
      fetchUsers(true);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        setError('Email address is already registered in the system.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to save user profile.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (user) => {
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post(`/api/users/${user.userId}/resend-invitation`);
      const data = response.data;
      if (data && data.emailSent) {
        setSuccessMsg(`Invitation email resent successfully to ${user.email}.`);
      } else {
        setSuccessMsg(`User updated, but invitation email could not be sent to ${user.email}. You can resend the invitation.`);
      }
      fetchUsers(true);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to resend invitation email.');
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/api/users/${user.userId}/status`, { status: newStatus });
      setSuccessMsg(`Account status for ${user.fullName} changed to ${newStatus}.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/users/${userToDelete.userId}`);
      setSuccessMsg('User account removed successfully.');
      setUserToDelete(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete user.');
      setUserToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole =
      roleFilter === 'ALL' ||
      u.role === roleFilter ||
      u.role === `ROLE_${roleFilter}`;
    const matchStatus =
      statusFilter === 'ALL' ||
      (u.status || 'ACTIVE').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchRole && matchStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">User Management</h2>
          <p className="text-secondary small mb-0">Control workspace access, roles, account activation statuses, and credentials audit</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" onClick={openCreateModal}>
            <i className="bi bi-person-plus-fill fs-5"></i>
            <span>+ Add User</span>
          </button>
        )}
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
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-light rounded-end-3"
                placeholder="Search by full name or email address..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ROLE_ADMIN</option>
              <option value="PROJECT_MANAGER">ROLE_PROJECT_MANAGER</option>
              <option value="DEVELOPER">ROLE_DEVELOPER</option>
              <option value="TESTER">ROLE_TESTER</option>
              <option value="USER">ROLE_USER</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredUsers.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Fetching real user directory from backend...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-people-fill display-4 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Matching Users Found</h4>
          <p className="text-secondary mb-4 small">Try adjusting your search criteria or register a new user.</p>
          {isAdmin && (
            <button className="btn btn-primary mx-auto rounded-3 px-4" onClick={openCreateModal}>
              Register New User
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
                    <th className="px-4 py-3 text-secondary">User ID</th>
                    <th className="py-3 text-secondary">Full Name</th>
                    <th className="py-3 text-secondary">Email Address</th>
                    <th className="py-3 text-secondary">Assigned Role</th>
                    <th className="py-3 text-secondary">Account Status</th>
                    <th className="py-3 text-secondary">Phone</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr key={user.userId} className="border-bottom border-secondary border-opacity-10">
                      <td className="px-4 text-secondary">#{user.userId}</td>
                      <td className="fw-bold text-light">{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${
                          user.role === 'ROLE_ADMIN' ? 'bg-danger' :
                          user.role === 'ROLE_PROJECT_MANAGER' ? 'bg-warning text-dark' :
                          user.role === 'ROLE_TESTER' ? 'bg-info text-dark' : 'bg-primary'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.status === 'ACTIVE' ? 'bg-success' : user.status === 'INVITED' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          {user.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td>{user.phone || 'N/A'}</td>
                      <td className="px-4 text-end">
                        <button
                          className="btn btn-sm btn-outline-light me-1 rounded-2"
                          title="View User"
                          aria-label="View User"
                          onClick={() => setShowDetailModal(user)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {isAdmin && (
                          <>
                            {user.status === 'INVITED' && (
                              <button
                                className="btn btn-sm btn-outline-primary me-1 rounded-2"
                                title="Resend Invitation"
                                aria-label="Resend Invitation"
                                onClick={() => handleResendInvitation(user)}
                              >
                                <i className="bi bi-envelope-paper"></i>
                              </button>
                            )}
                            <button
                              className={`btn btn-sm ${user.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'} me-1 rounded-2`}
                              title={user.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                              aria-label={user.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                              onClick={() => handleToggleStatus(user)}
                            >
                              <i className={`bi ${user.status === 'ACTIVE' ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info me-1 rounded-2"
                              title="Edit User"
                              aria-label="Edit User"
                              onClick={() => openEditModal(user)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger rounded-2"
                              title="Delete User"
                              aria-label="Delete User"
                              onClick={() => confirmDelete(user)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-secondary small">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} users
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
                  {isEditing ? 'Edit User' : 'Add User'}
                </h5>
                <button type="button" className="btn-close btn-close-white" disabled={submitting} onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={submitting}
                      required
                    />
                  </div>
                  {isEditing && (
                    <div className="mb-3">
                      <label className="form-label text-secondary small">New Password (Leave blank to preserve current password)</label>
                      <input
                        type="password"
                        name="passwordHash"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.passwordHash}
                        onChange={handleInputChange}
                        disabled={submitting}
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Assigned Access Role</label>
                      <select
                        name="role"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={submitting}
                        required
                      >
                        <option value="ROLE_ADMIN">ROLE_ADMIN</option>
                        <option value="ROLE_PROJECT_MANAGER">ROLE_PROJECT_MANAGER</option>
                        <option value="ROLE_DEVELOPER">ROLE_DEVELOPER</option>
                        <option value="ROLE_TESTER">ROLE_TESTER</option>
                        <option value="ROLE_USER">ROLE_USER</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">Account Status</label>
                      <select
                        name="status"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={submitting}
                        required
                      >
                        <option value="INVITED">INVITED</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Contact Phone</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" disabled={submitting} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4 d-flex align-items-center gap-2" disabled={submitting}>
                    {submitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                    <span>{submitting ? (isEditing ? 'Saving...' : 'Adding User...') : (isEditing ? 'Save Profile' : 'Add User')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-light">User Profile & Audit Log</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(null)}></button>
              </div>
              <div className="modal-body small">
                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom border-secondary border-opacity-25">
                  <div className="bg-primary text-light rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4" style={{ width: '48px', height: '48px' }}>
                    {(showDetailModal.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-light">{showDetailModal.fullName}</h5>
                    <div className="text-secondary">{showDetailModal.email}</div>
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-5 text-secondary">System User ID:</div>
                  <div className="col-7 font-monospace">#{showDetailModal.userId}</div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-5 text-secondary">Current Role:</div>
                  <div className="col-7"><span className="badge bg-primary">{showDetailModal.role}</span></div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-5 text-secondary">Account Status:</div>
                  <div className="col-7"><span className="badge bg-success">{showDetailModal.status || 'ACTIVE'}</span></div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-5 text-secondary">Phone Number:</div>
                  <div className="col-7">{showDetailModal.phone || 'Not registered'}</div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-5 text-secondary">Account Created At:</div>
                  <div className="col-7">{showDetailModal.createdAt ? new Date(showDetailModal.createdAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowDetailModal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {userToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setUserToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete user account <strong>{userToDelete.fullName}</strong>?</p>
                <p className="text-secondary small mb-0">This action will deactivate access and cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setUserToDelete(null)}>
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

export default UsersPage;

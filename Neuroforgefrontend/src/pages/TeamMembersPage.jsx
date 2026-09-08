import React, { useEffect, useState } from 'react';
import api from '../services/api';

const formatRoleName = (name) => {
  if (!name) return '';
  if (name.includes('_') || name === name.toUpperCase()) {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  return name;
};

const TeamMembersPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = ['ADMIN', 'ROLE_ADMIN', 'PROJECT_MANAGER', 'ROLE_PROJECT_MANAGER'].includes(currentUser.role);

  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    memberId: null,
    teamId: '',
    userId: '',
    joinedAt: ''
  });

  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Dynamic Add Role Modal State
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [roleModalError, setRoleModalError] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);

  const fetchDependenciesAndMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const [memRes, teamRes, userRes, roleRes] = await Promise.all([
        api.get('/api/team-members'),
        api.get('/api/teams'),
        api.get('/api/users'),
        api.get('/api/team-roles')
      ]);
      setTeamMembers(memRes.data || []);
      setTeams(teamRes.data || []);
      setUsers(userRes.data || []);
      setAvailableRoles(roleRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch team members allocation registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndMembers();
  }, []);

  const openCreateModal = () => {
    const defaultTeamId = teams.length > 0 ? teams[0].teamId : '';
    const activeUsers = users.filter(u => u.status?.toUpperCase() === 'ACTIVE');
    // Find first active user not already in defaultTeamId
    const existingUserIdsInTeam = teamMembers
      .filter(m => m.teamId === defaultTeamId)
      .map(m => m.userId);
    const availableUser = activeUsers.find(u => !existingUserIdsInTeam.includes(u.userId));
    const defaultUserId = availableUser ? availableUser.userId : '';

    setFormData({
      memberId: null,
      teamId: defaultTeamId,
      userId: defaultUserId,
      joinedAt: new Date().toISOString()
    });

    // Default select "Developer" role if available
    const devRole = availableRoles.find(r => r.roleName.toLowerCase() === 'developer');
    if (devRole) {
      setSelectedRoleIds([devRole.roleId]);
    } else if (availableRoles.length > 0) {
      setSelectedRoleIds([availableRoles[0].roleId]);
    } else {
      setSelectedRoleIds([]);
    }

    setIsEditing(false);
    setShowAddRoleModal(false);
    setNewRoleName('');
    setError('');
    setRoleModalError('');
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setFormData({
      memberId: member.memberId,
      teamId: member.teamId || (teams.length > 0 ? teams[0].teamId : ''),
      userId: member.userId || (users.length > 0 ? users[0].userId : ''),
      joinedAt: member.joinedAt || new Date().toISOString()
    });

    let rIds = [];
    if (member.roles && member.roles.length > 0) {
      rIds = member.roles.map(r => r.roleId);
    } else if (member.roleIds && member.roleIds.length > 0) {
      rIds = member.roleIds;
    } else if (member.roleInTeam) {
      const parts = member.roleInTeam.split(',').map(p => p.trim().toLowerCase());
      rIds = availableRoles.filter(r => parts.includes(r.roleName.toLowerCase())).map(r => r.roleId);
    }

    setSelectedRoleIds(rIds);
    setIsEditing(true);
    setShowAddRoleModal(false);
    setNewRoleName('');
    setError('');
    setRoleModalError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['teamId', 'userId'].includes(name);
    const parsedVal = isNumericField && value !== '' ? parseInt(value, 10) : value;

    setError('');

    setFormData((prev) => {
      const next = { ...prev, [name]: parsedVal };

      // If teamId changes, check if current userId is already in the new team
      if (name === 'teamId' && !isEditing && parsedVal && next.userId) {
        const alreadyInNewTeam = teamMembers.some(
          m => m.teamId === parsedVal && m.userId === next.userId
        );
        if (alreadyInNewTeam) {
          // Switch userId to first available non-assigned user if possible
          const existingUserIds = teamMembers.filter(m => m.teamId === parsedVal).map(m => m.userId);
          const nextUser = users.find(u => !existingUserIds.includes(u.userId));
          if (nextUser) {
            next.userId = nextUser.userId;
          }
        }
      }

      return next;
    });

    if (name === 'teamId' && parsedVal) {
      api.get(`/api/team-roles?teamId=${parsedVal}`).then(res => {
        setAvailableRoles(res.data || []);
      }).catch(console.error);
    }
  };

  const addRoleSelection = (roleId) => {
    if (!selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(prev => [...prev, roleId]);
    }
  };

  const removeRoleSelection = (roleId) => {
    setSelectedRoleIds(prev => prev.filter(id => id !== roleId));
  };

  const handleAddRoleSubmit = async (e) => {
    if (e) e.preventDefault();
    setRoleModalError('');
    if (!newRoleName || !newRoleName.trim()) {
      setRoleModalError('Role name cannot be empty.');
      return;
    }

    const trimmed = newRoleName.trim();
    const existing = availableRoles.find(r => r.roleName.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      addRoleSelection(existing.roleId);
      setNewRoleName('');
      setShowAddRoleModal(false);
      return;
    }

    setCreatingRole(true);
    try {
      const response = await api.post('/api/team-roles', {
        roleName: trimmed,
        teamId: formData.teamId ? parseInt(formData.teamId, 10) : null
      });
      const newRole = response.data;

      setAvailableRoles(prev => [...prev.filter(r => r.roleId !== newRole.roleId), newRole]);
      addRoleSelection(newRole.roleId);
      setNewRoleName('');
      setShowAddRoleModal(false);
    } catch (err) {
      console.error(err);
      setRoleModalError(err.response?.data?.message || 'Failed to create new team role.');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.teamId) {
      setError('Team selection is required.');
      return;
    }
    if (!formData.userId) {
      setError('Member selection is required.');
      return;
    }

    // Validation: Check if user is already a member of the selected team
    if (!isEditing) {
      const alreadyMember = teamMembers.some(
        m => m.teamId === parseInt(formData.teamId, 10) && m.userId === parseInt(formData.userId, 10)
      );
      if (alreadyMember) {
        const selectedUser = users.find(u => u.userId === parseInt(formData.userId, 10));
        const selectedTeam = teams.find(t => t.teamId === parseInt(formData.teamId, 10));
        const userName = selectedUser ? selectedUser.fullName : `User #${formData.userId}`;
        const teamName = selectedTeam ? selectedTeam.teamName : `Team #${formData.teamId}`;
        setError(`${userName} is already a member of ${teamName}.`);
        return;
      }
    }

    const roleInTeamString = selectedRoleIds
      .map(id => availableRoles.find(r => r.roleId === id)?.roleName)
      .filter(Boolean)
      .map(formatRoleName)
      .join(', ');

    const payload = {
      ...formData,
      roleIds: selectedRoleIds,
      roleInTeam: roleInTeamString
    };

    try {
      if (isEditing) {
        await api.put(`/api/team-members/${formData.memberId}`, payload);
        setSuccessMsg('Team member updated successfully.');
      } else {
        await api.post('/api/team-members', payload);
        setSuccessMsg('Team member added to team successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndMembers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save team member.');
    }
  };

  const confirmDelete = (member) => {
    setMemberToDelete(member);
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await api.delete(`/api/team-members/${memberToDelete.memberId}`);
      setSuccessMsg('Team member removed successfully.');
      setMemberToDelete(null);
      fetchDependenciesAndMembers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to remove team member.');
      setMemberToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredTeamMembers = teamMembers.filter((m) => {
    const userObj = users.find(u => u.userId === m.userId);
    const userName = userObj ? userObj.fullName : '';
    const rolesStr = (m.roles && m.roles.length > 0)
      ? m.roles.map(r => formatRoleName(r.roleName)).join(' ')
      : formatRoleName(m.roleInTeam || '');

    const matchSearch =
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rolesStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTeam = teamFilter === 'ALL' || m.teamId === parseInt(teamFilter, 10);
    const matchRole = roleFilter === 'ALL' || rolesStr.toLowerCase().includes(roleFilter.toLowerCase());
    return matchSearch && matchTeam && matchRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTeamMembers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeamMembers = filteredTeamMembers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Team Members Registry</h2>
          <p className="text-secondary small mb-0">Assign personnel to team units, define dynamic team responsibilities & maintain team rosters</p>
        </div>
        {canManage && (
          <button 
            className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
            onClick={openCreateModal}
            disabled={teams.length === 0}
          >
            <i className="bi bi-person-plus fs-5"></i>
            <span>Add Member</span>
          </button>
        )}
      </div>

      {teams.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No development teams formed. Please create a Team before adding Team Members.
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success d-flex align-items-center alert-dismissible fade show rounded-3 py-2.5 mb-4" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {error && !showModal && (
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
                placeholder="Search members by user name or team role..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={teamFilter}
              onChange={(e) => { setTeamFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Teams</option>
              {teams.map(t => (
                <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Team Roles</option>
              {availableRoles.map(r => (
                <option key={r.roleId} value={r.roleName}>{formatRoleName(r.roleName)}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredTeamMembers.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading team members roster...</p>
        </div>
      ) : filteredTeamMembers.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-person-lines-fill display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Team Members Found</h4>
          <p className="text-secondary mb-4 small">Get started by allocating team members to active teams.</p>
          {canManage && (
            <button 
              className="btn btn-primary mx-auto rounded-3 px-4" 
              onClick={openCreateModal}
              disabled={teams.length === 0}
            >
              Add Member
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
                    <th className="px-4 py-3 text-secondary">Member ID</th>
                    <th className="py-3 text-secondary">Team Name</th>
                    <th className="py-3 text-secondary">User / Personnel</th>
                    <th className="py-3 text-secondary">Roles inside Team</th>
                    <th className="py-3 text-secondary">Joined Date</th>
                    {canManage && <th className="px-4 py-3 text-end text-secondary">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentTeamMembers.map((member) => {
                    const teamObj = teams.find(t => t.teamId === member.teamId);
                    const userObj = users.find(u => u.userId === member.userId);

                    return (
                      <tr key={member.memberId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{member.memberId}</td>
                        <td className="fw-bold text-light">
                          {teamObj ? teamObj.teamName : `Team #${member.teamId}`}
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {userObj ? userObj.fullName : `User #${member.userId}`}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {member.roles && member.roles.length > 0 ? (
                              member.roles.map(r => (
                                <span key={r.roleId} className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill">
                                  {formatRoleName(r.roleName)}
                                </span>
                              ))
                            ) : (
                              <span className="badge bg-primary">{formatRoleName(member.roleInTeam) || 'Member'}</span>
                            )}
                          </div>
                        </td>
                        <td className="small text-secondary">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        {canManage && (
                          <td className="px-4 text-end">
                            <button
                              className="btn btn-sm btn-outline-info me-2 rounded-2"
                              onClick={() => openEditModal(member)}
                              title="Edit Member Roles"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger rounded-2"
                              onClick={() => confirmDelete(member)}
                              title="Remove Member"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTeamMembers.length)} of {filteredTeamMembers.length} team members
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

      {/* ADD MEMBER TO TEAM / MODIFY MEMBER ROLES MODAL */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4 shadow-lg">
              <div className="modal-header border-secondary border-opacity-25 px-4 py-3">
                <h5 className="modal-title fw-bold text-light fs-5 mb-0">
                  {isEditing ? 'Modify Team Member Roles' : 'Add Member to Team'}
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

                  {/* Team Field */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">Team</label>
                    <select
                      name="teamId"
                      className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      value={formData.teamId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map((t) => (
                        <option key={t.teamId} value={t.teamId}>
                          {t.teamName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Member Field */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold mb-1.5">Select Member</label>
                    <select
                      name="userId"
                      className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      value={formData.userId}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    >
                      <option value="">{loading ? 'Loading members...' : 'Select Member'}</option>
                      {users
                        .filter((u) => (u.status?.toUpperCase() === 'ACTIVE') || (isEditing && u.userId === parseInt(formData.userId, 10)))
                        .map((u) => {
                          const isMemberInSelectedTeam = !isEditing && teamMembers.some(
                            m => m.teamId === parseInt(formData.teamId, 10) && m.userId === u.userId
                          );
                          return (
                            <option key={u.userId} value={u.userId} disabled={isMemberInSelectedTeam}>
                              {u.fullName} ({formatRoleName(u.role)}){isMemberInSelectedTeam ? ' — Already in team' : ''}
                            </option>
                          );
                        })}
                    </select>
                    {!loading && users.filter(u => u.status?.toUpperCase() === 'ACTIVE').length === 0 && (
                      <div className="text-warning small mt-1">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        No active users available in the system.
                      </div>
                    )}
                  </div>

                  {/* Role Inside Team Field */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1.5">
                      <label className="form-label text-secondary small fw-semibold mb-0">Role Inside Team</label>
                      {canManage && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-primary text-decoration-none p-0 fw-semibold small hover-opacity-75"
                          onClick={() => { setRoleModalError(''); setNewRoleName(''); setShowAddRoleModal(true); }}
                        >
                          + Add Role
                        </button>
                      )}
                    </div>

                    {/* Selected Role Tag Chips Container */}
                    {selectedRoleIds.length > 0 && (
                      <div className="d-flex flex-wrap align-items-center gap-1.5 p-2 bg-dark border border-secondary border-opacity-50 rounded-3 mb-2" style={{ backgroundColor: '#161622' }}>
                        {selectedRoleIds.map((rId) => {
                          const roleObj = availableRoles.find((r) => r.roleId === rId);
                          const rawName = roleObj ? roleObj.roleName : `Role #${rId}`;
                          const displayName = formatRoleName(rawName);
                          return (
                            <span
                              key={rId}
                              className="badge bg-primary text-white d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-pill shadow-sm"
                              style={{ fontSize: '0.8rem', fontWeight: 500 }}
                            >
                              <span className="text-truncate" style={{ maxWidth: '200px' }}>{displayName}</span>
                              <button
                                type="button"
                                className="btn-close btn-close-white opacity-75 ms-0.5 cursor-pointer"
                                style={{ width: '0.45em', height: '0.45em' }}
                                onClick={() => removeRoleSelection(rId)}
                                aria-label="Remove role assignment"
                              />
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Role Dropdown Selector */}
                    <select
                      className="form-select bg-dark border-secondary text-light rounded-3 py-2 px-3 small"
                      value=""
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val) addRoleSelection(val);
                      }}
                    >
                      <option value="">+ Select role to assign...</option>
                      {availableRoles
                        .filter((r) => !r.teamId || r.teamId === formData.teamId)
                        .filter((r) => !selectedRoleIds.includes(r.roleId))
                        .map((r) => (
                          <option key={r.roleId} value={r.roleId}>
                            {formatRoleName(r.roleName)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3 px-4 py-2 small fw-semibold"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3 px-4 py-2 small fw-semibold shadow-sm"
                  >
                    {isEditing ? 'Save Changes' : 'Add to Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED CREATE TEAM ROLE MODAL */}
      {showAddRoleModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-primary border-opacity-50 text-light rounded-4 shadow-lg" style={{ backgroundColor: '#1e1e2d' }}>
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-primary fs-6">Create Team Role</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddRoleModal(false)}></button>
              </div>
              <form onSubmit={handleAddRoleSubmit}>
                <div className="modal-body">
                  {roleModalError && (
                    <div className="alert alert-danger py-1.5 px-2.5 rounded-3 mb-2 small">
                      {roleModalError}
                    </div>
                  )}
                  <div className="mb-2">
                    <label className="form-label text-secondary small fw-semibold">Role Name</label>
                    <input
                      type="text"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      placeholder="e.g. Automation Engineer, ML Engineer..."
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25 py-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-3 px-3" onClick={() => setShowAddRoleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary rounded-3 px-3 fw-semibold" disabled={!newRoleName.trim() || creatingRole}>
                    {creatingRole ? 'Creating...' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {memberToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMemberToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to remove member <strong>#{memberToDelete.memberId}</strong> from the team?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setMemberToDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger rounded-3" onClick={handleDelete}>
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembersPage;


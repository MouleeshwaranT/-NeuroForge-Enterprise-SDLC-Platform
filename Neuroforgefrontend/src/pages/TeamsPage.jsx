import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import TeamMembersPage from './TeamMembersPage';

const TeamsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'members' ? 'members' : 'teams';
  const [activeTab, setActiveTab] = useState(initialTab);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = ['ADMIN', 'ROLE_ADMIN', 'PROJECT_MANAGER', 'ROLE_PROJECT_MANAGER'].includes(currentUser.role);

  const [teams, setTeams] = useState([]);
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
    teamId: null,
    projectId: '',
    teamName: '',
    createdAt: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  const fetchTeamsAndProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamRes, projRes] = await Promise.all([
        api.get('/api/teams'),
        api.get('/api/projects')
      ]);
      setTeams(teamRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch development teams from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndProjects();
  }, []);

  const openCreateModal = () => {
    setFormData({
      teamId: null,
      projectId: projects.length > 0 ? projects[0].projectId : '',
      teamName: '',
      createdAt: new Date().toISOString()
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (team) => {
    setFormData({
      teamId: team.teamId,
      projectId: team.projectId || (projects.length > 0 ? projects[0].projectId : ''),
      teamName: team.teamName || '',
      createdAt: team.createdAt || new Date().toISOString()
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
    if (!formData.teamName.trim()) {
      setError('Team name is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Valid project association is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/teams/${formData.teamId}`, formData);
        setSuccessMsg('Team updated successfully.');
      } else {
        await api.post('/api/teams', formData);
        setSuccessMsg('Team created successfully.');
      }
      setShowModal(false);
      fetchTeamsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save team.');
    }
  };

  const confirmDelete = (team) => {
    setTeamToDelete(team);
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;
    try {
      await api.delete(`/api/teams/${teamToDelete.teamId}`);
      setSuccessMsg('Team deleted successfully.');
      setTeamToDelete(null);
      fetchTeamsAndProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete team.');
      setTeamToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredTeams = teams.filter((t) => {
    const matchSearch = (t.teamName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || t.projectId === parseInt(projectFilter, 10);
    return matchSearch && matchProject;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeams = filteredTeams.slice(indexOfFirstItem, indexOfLastItem);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'members' ? { tab: 'members' } : {});
  };

  return (
    <div className="container-fluid py-4 text-light">
      {/* Top Section Navigation Tabs */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary border-opacity-25 pb-2">
        <ul className="nav nav-pills gap-2 mb-0">
          <li className="nav-item">
            <button
              className={`nav-link px-3 py-2 rounded-3 fw-semibold small d-flex align-items-center gap-2 transition-all ${
                activeTab === 'teams'
                  ? 'bg-primary text-white shadow-sm'
                  : 'btn-outline-secondary text-secondary hover-opacity-75'
              }`}
              onClick={() => handleTabSwitch('teams')}
            >
              <i className="bi bi-people-fill"></i>
              <span>Teams Overview</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link px-3 py-2 rounded-3 fw-semibold small d-flex align-items-center gap-2 transition-all ${
                activeTab === 'members'
                  ? 'bg-primary text-white shadow-sm'
                  : 'btn-outline-secondary text-secondary hover-opacity-75'
              }`}
              onClick={() => handleTabSwitch('members')}
            >
              <i className="bi bi-person-badge-fill"></i>
              <span>Team Members & Roles</span>
            </button>
          </li>
        </ul>
      </div>

      {activeTab === 'members' ? (
        <TeamMembersPage />
      ) : (
        <>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h2 className="fw-bold text-light">Development Teams</h2>
              <p className="text-secondary small mb-0">Manage organizational development teams and project resource mappings</p>
            </div>
            {canManage && (
              <button 
                className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
                onClick={openCreateModal}
                disabled={projects.length === 0}
              >
                <i className="bi bi-plus-lg fs-5"></i>
                <span>New Team</span>
              </button>
            )}
          </div>

          {projects.length === 0 && !loading && (
            <div className="alert alert-warning py-2.5 rounded-3 mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              No active projects registered. Please create a Project before forming a Team.
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
                    placeholder="Search teams by name..."
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
                  {filteredTeams.length} total
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="text-secondary mt-2 small">Loading teams registry...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
              <i className="bi bi-people-fill display-3 text-secondary mb-3"></i>
              <h4 className="fw-bold text-light">No Teams Found</h4>
              <p className="text-secondary mb-4 small">Get started by creating your first development team.</p>
              {canManage && (
                <button 
                  className="btn btn-primary mx-auto rounded-3 px-4" 
                  onClick={openCreateModal}
                  disabled={projects.length === 0}
                >
                  Create Team
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
                        <th className="py-3 text-secondary">Team Name</th>
                        <th className="py-3 text-secondary">Project Link</th>
                        <th className="py-3 text-secondary">Created At</th>
                        <th className="px-4 py-3 text-end text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTeams.map((team) => {
                        const project = projects.find(p => p.projectId === team.projectId);
                        return (
                          <tr key={team.teamId} className="border-bottom border-secondary border-opacity-10">
                            <td className="px-4 text-secondary font-monospace">#{team.teamId}</td>
                            <td className="fw-bold text-light">{team.teamName}</td>
                            <td>
                              <span className="badge bg-secondary">
                                {project ? project.name : `Project #${team.projectId}`}
                              </span>
                            </td>
                            <td className="small text-secondary">
                              {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 text-end">
                              <button
                                className="btn btn-sm btn-outline-primary me-2 rounded-2"
                                onClick={() => handleTabSwitch('members')}
                                title="Manage Team Members & Roles"
                              >
                                <i className="bi bi-person-gear me-1"></i>
                                <span>Members & Roles</span>
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline-info me-2 rounded-2"
                                    onClick={() => openEditModal(team)}
                                    title="Edit Team"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger rounded-2"
                                    onClick={() => confirmDelete(team)}
                                    title="Delete Team"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </>
                              )}
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
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTeams.length)} of {filteredTeams.length} teams
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
        </>
      )}

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-primary">
                  {isEditing ? 'Modify Team' : 'Form New Team'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Team Name</label>
                    <input
                      type="text"
                      name="teamName"
                      className="form-control bg-dark border-secondary text-light rounded-3"
                      value={formData.teamName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Project Association</label>
                    <select
                      name="projectId"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.projectId}
                      onChange={handleInputChange}
                      required
                    >
                      {projects.map((p) => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {teamToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTeamToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete team <strong>{teamToDelete.teamName}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setTeamToDelete(null)}>
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

export default TeamsPage;

import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ChatPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState({
    messageId: null,
    projectId: '',
    teamId: '',
    senderId: currentUser.userId || '',
    message: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const fetchDependenciesAndMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const [msgRes, projRes, teamRes, userRes] = await Promise.all([
        api.get('/api/chat-messages'),
        api.get('/api/projects'),
        api.get('/api/teams'),
        api.get('/api/users')
      ]);
      setMessages(msgRes.data || []);
      setProjects(projRes.data || []);
      setTeams(teamRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch chat messages from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndMessages();
  }, []);

  // Set default form values when projects/teams/users load
  useEffect(() => {
    if (!isEditing && projects.length > 0 && teams.length > 0 && users.length > 0) {
      setFormData((prev) => ({
        ...prev,
        projectId: prev.projectId || projects[0].projectId,
        teamId: prev.teamId || teams[0].teamId,
        senderId: currentUser.userId || prev.senderId || users[0].userId
      }));
    }
  }, [projects, teams, users, isEditing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['projectId', 'teamId', 'senderId'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumericField && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      setError('Message cannot be blank.');
      return;
    }
    if (!formData.projectId) {
      setError('Project association is required.');
      return;
    }
    if (!formData.teamId) {
      setError('Team association is required.');
      return;
    }
    if (!formData.senderId) {
      setError('Sender user is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/chat-messages/${formData.messageId}`, formData);
        setSuccessMsg('Message updated successfully.');
      } else {
        await api.post('/api/chat-messages', formData);
        setSuccessMsg('Message posted successfully.');
      }
      setFormData((prev) => ({
        ...prev,
        messageId: null,
        message: ''
      }));
      setIsEditing(false);
      fetchDependenciesAndMessages();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send chat message.');
    }
  };

  const handleEditClick = (msg) => {
    setFormData({
      messageId: msg.messageId,
      projectId: msg.projectId,
      teamId: msg.teamId,
      senderId: msg.senderId,
      message: msg.message || ''
    });
    setIsEditing(true);
    setError('');
  };

  const cancelEdit = () => {
    setFormData((prev) => ({
      ...prev,
      messageId: null,
      message: ''
    }));
    setIsEditing(false);
  };

  const confirmDelete = (msg) => {
    setMessageToDelete(msg);
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    try {
      await api.delete(`/api/chat-messages/${messageToDelete.messageId}`);
      setSuccessMsg('Message deleted successfully.');
      setMessageToDelete(null);
      fetchDependenciesAndMessages();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete message.');
      setMessageToDelete(null);
    }
  };

  // Filter Messages
  const filteredMessages = messages.filter((msg) => {
    const matchSearch = (msg.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || msg.projectId === parseInt(projectFilter, 10);
    const matchTeam = teamFilter === 'ALL' || msg.teamId === parseInt(teamFilter, 10);
    return matchSearch && matchProject && matchTeam;
  });

  return (
    <div className="container-fluid py-4 text-light d-flex flex-column" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="mb-4">
        <h2 className="fw-bold text-light">Team Chat & Collaboration Hub</h2>
        <p className="text-secondary small mb-0">Real-time enterprise channel messages linked to project deliverables and dev teams</p>
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

      {/* Filter and Channel Filter Bar */}
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
                placeholder="Search message content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="ALL">All Project Channels</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select bg-dark border-secondary text-light rounded-3"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="ALL">All Team Channels</option>
              {teams.map(t => (
                <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredMessages.length} msgs
            </span>
          </div>
        </div>
      </div>

      {/* Chat Board Body */}
      <div className="row g-4 flex-grow-1">
        {/* Messages List Panel */}
        <div className="col-12 col-lg-8 d-flex flex-column">
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 p-3 flex-grow-1 overflow-hidden d-flex flex-column shadow-sm" style={{ minHeight: '400px', backgroundColor: '#1e1e2d' }}>
            <h5 className="fw-bold border-bottom border-secondary border-opacity-25 pb-2 mb-3 text-light d-flex justify-content-between align-items-center">
              <span>Channel Discussion Feed</span>
              <button className="btn btn-sm btn-outline-secondary rounded-2" onClick={fetchDependenciesAndMessages} title="Refresh Messages">
                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
              </button>
            </h5>
            {loading ? (
              <div className="text-center my-auto">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-secondary small mt-2">Loading channel discussion thread...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center text-secondary my-auto small py-5">
                <i className="bi bi-chat-left-quote display-6 mb-3 text-secondary"></i>
                <div>No messages found matching your selected channels or search filter.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 overflow-y-auto pe-2" style={{ maxHeight: '550px' }}>
                {filteredMessages.map((msg) => {
                  const projectObj = projects.find(p => p.projectId === msg.projectId);
                  const teamObj = teams.find(t => t.teamId === msg.teamId);
                  const senderUser = users.find(u => u.userId === msg.senderId);
                  const isMine = currentUser.userId === msg.senderId;

                  return (
                    <div key={msg.messageId} className={`p-3 rounded-3 border ${isMine ? 'bg-primary bg-opacity-10 border-primary border-opacity-25' : 'bg-secondary bg-opacity-10 border-secondary border-opacity-25'}`}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-primary small d-flex align-items-center gap-1.5">
                          <i className="bi bi-person-circle"></i>
                          <span>{senderUser ? senderUser.fullName : `User #${msg.senderId}`}</span>
                          {senderUser?.role && <span className="badge bg-dark border border-secondary border-opacity-25 text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>{senderUser.role}</span>}
                        </span>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-link text-info p-0 text-decoration-none" onClick={() => handleEditClick(msg)} title="Edit Message">
                            <i className="bi bi-pencil small"></i>
                          </button>
                          <button className="btn btn-sm btn-link text-danger p-0 text-decoration-none" onClick={() => confirmDelete(msg)} title="Delete Message">
                            <i className="bi bi-trash small"></i>
                          </button>
                        </div>
                      </div>
                      <div className="mb-2 text-light">{msg.message}</div>
                      <div className="d-flex gap-2">
                        <span className="badge bg-secondary small text-opacity-75">
                          Project: {projectObj ? projectObj.name : `#${msg.projectId}`}
                        </span>
                        <span className="badge bg-dark border border-secondary border-opacity-50 small text-opacity-75">
                          Team: {teamObj ? teamObj.teamName : `#${msg.teamId}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Control and Compose Panel */}
        <div className="col-12 col-lg-4">
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 p-4 shadow-sm" style={{ backgroundColor: '#1e1e2d' }}>
            <h5 className="fw-bold mb-3 text-light">{isEditing ? 'Modify Message' : 'Post Channel Message'}</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-secondary small">Sender User</label>
                <select
                  name="senderId"
                  className="form-select bg-dark border-secondary text-light rounded-3"
                  value={formData.senderId}
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
              <div className="mb-3">
                <label className="form-label text-secondary small">Target Team</label>
                <select
                  name="teamId"
                  className="form-select bg-dark border-secondary text-light rounded-3"
                  value={formData.teamId}
                  onChange={handleInputChange}
                  required
                >
                  {teams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label text-secondary small">Message Text</label>
                <textarea
                  name="message"
                  className="form-control bg-dark border-secondary text-light rounded-3"
                  rows="3"
                  placeholder="Share update or ask a question..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary rounded-3 py-2 fw-semibold">
                  {isEditing ? 'Save Message Changes' : 'Send Message'}
                </button>
                {isEditing && (
                  <button type="button" className="btn btn-outline-secondary rounded-3 py-2" onClick={cancelEdit}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      {messageToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMessageToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this channel message?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setMessageToDelete(null)}>
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

export default ChatPage;

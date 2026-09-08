import React, { useEffect, useState } from 'react';
import api from '../services/api';

const DocumentsPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form State
  const [formData, setFormData] = useState({
    documentId: null,
    projectId: '',
    uploadedBy: currentUser.userId || '',
    documentName: '',
    filePath: '',
    documentType: 'SPECIFICATION',
    uploadDate: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const fetchDependenciesAndDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const [docRes, projRes, userRes] = await Promise.all([
        api.get('/api/documents'),
        api.get('/api/projects'),
        api.get('/api/users')
      ]);
      setDocuments(docRes.data || []);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch documentation metadata from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependenciesAndDocuments();
  }, []);

  const openCreateModal = () => {
    setFormData({
      documentId: null,
      projectId: projects.length > 0 ? projects[0].projectId : '',
      uploadedBy: currentUser.userId || (users.length > 0 ? users[0].userId : ''),
      documentName: '',
      filePath: '',
      documentType: 'SPECIFICATION',
      uploadDate: new Date().toISOString()
    });
    setIsEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    setFormData({
      documentId: doc.documentId,
      projectId: doc.projectId || (projects.length > 0 ? projects[0].projectId : ''),
      uploadedBy: doc.uploadedBy || (currentUser.userId || ''),
      documentName: doc.documentName || '',
      filePath: doc.filePath || '',
      documentType: doc.documentType || 'SPECIFICATION',
      uploadDate: doc.uploadDate || new Date().toISOString()
    });
    setIsEditing(true);
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = ['projectId', 'uploadedBy'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumericField && value !== '' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.documentName.trim()) {
      setError('Document name is required.');
      return;
    }
    if (!formData.filePath.trim()) {
      setError('File path metadata is required.');
      return;
    }
    if (!formData.projectId) {
      setError('Project association is required.');
      return;
    }
    if (!formData.uploadedBy) {
      setError('Uploaded By user is required.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/api/documents/${formData.documentId}`, formData);
        setSuccessMsg('Document updated successfully.');
      } else {
        await api.post('/api/documents', formData);
        setSuccessMsg('Document created successfully.');
      }
      setShowModal(false);
      fetchDependenciesAndDocuments();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save document metadata.');
    }
  };

  const confirmDelete = (doc) => {
    setDocumentToDelete(doc);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await api.delete(`/api/documents/${documentToDelete.documentId}`);
      setSuccessMsg('Document profile deleted successfully.');
      setDocumentToDelete(null);
      fetchDependenciesAndDocuments();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete document.');
      setDocumentToDelete(null);
    }
  };

  // Filter & Search Logic
  const filteredDocuments = documents.filter((d) => {
    const matchSearch =
      (d.documentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.filePath || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = projectFilter === 'ALL' || d.projectId === parseInt(projectFilter, 10);
    const matchType = typeFilter === 'ALL' || (d.documentType || '').toUpperCase() === typeFilter.toUpperCase();
    return matchSearch && matchProject && matchType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocuments = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid py-4 text-light">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-light">Documentation & Knowledge Base</h2>
          <p className="text-secondary small mb-0">Manage project specification files, architecture guides, and technical documentation</p>
        </div>
        <button 
          className="btn btn-primary px-4 py-2.5 rounded-3 fw-semibold d-flex align-items-center gap-2" 
          onClick={openCreateModal}
          disabled={projects.length === 0}
        >
          <i className="bi bi-file-earmark-plus fs-5"></i>
          <span>Add Document</span>
        </button>
      </div>

      {projects.length === 0 && !loading && (
        <div className="alert alert-warning py-2.5 rounded-3 mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          No projects available. Please create a Project before uploading documentation metadata.
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
                placeholder="Search documents by title or file path..."
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
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Document Types</option>
              <option value="SPECIFICATION">SPECIFICATION</option>
              <option value="ARCHITECTURE">ARCHITECTURE</option>
              <option value="USER_GUIDE">USER_GUIDE</option>
              <option value="API_DOCS">API_DOCS</option>
              <option value="DEPLOYMENT_MANUAL">DEPLOYMENT_MANUAL</option>
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-center justify-content-end">
            <span className="badge bg-secondary px-3 py-2 rounded-3 w-100 text-center">
              {filteredDocuments.length} total
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading document registry...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="card bg-dark border-secondary border-opacity-25 rounded-4 p-5 text-center my-4" style={{ backgroundColor: '#1e1e2d' }}>
          <i className="bi bi-file-earmark-text-fill display-3 text-secondary mb-3"></i>
          <h4 className="fw-bold text-light">No Documents Found</h4>
          <p className="text-secondary mb-4 small">Get started by linking your first project technical document.</p>
          <button 
            className="btn btn-primary mx-auto rounded-3 px-4" 
            onClick={openCreateModal}
            disabled={projects.length === 0}
          >
            Add Document
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
                    <th className="py-3 text-secondary">Document Name</th>
                    <th className="py-3 text-secondary">Project Link</th>
                    <th className="py-3 text-secondary">Uploaded By</th>
                    <th className="py-3 text-secondary">File Path</th>
                    <th className="py-3 text-secondary">Type</th>
                    <th className="py-3 text-secondary">Upload Date</th>
                    <th className="px-4 py-3 text-end text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDocuments.map((doc) => {
                    const project = projects.find(p => p.projectId === doc.projectId);
                    const user = users.find(u => u.userId === doc.uploadedBy);
                    return (
                      <tr key={doc.documentId} className="border-bottom border-secondary border-opacity-10">
                        <td className="px-4 text-secondary font-monospace">#{doc.documentId}</td>
                        <td className="fw-bold text-light">{doc.documentName}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {project ? project.name : `Project #${doc.projectId}`}
                          </span>
                        </td>
                        <td className="small text-light">
                          {user ? user.fullName : `User #${doc.uploadedBy}`}
                        </td>
                        <td className="small text-secondary font-monospace">{doc.filePath}</td>
                        <td>
                          <span className="badge bg-info text-dark fw-semibold">{doc.documentType}</span>
                        </td>
                        <td className="small text-secondary">
                          {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 text-end">
                          <button
                            className="btn btn-sm btn-outline-info me-2 rounded-2"
                            onClick={() => openEditModal(doc)}
                            title="Edit Document"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-2"
                            onClick={() => confirmDelete(doc)}
                            title="Delete Document"
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length} documents
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
                  {isEditing ? 'Modify Document Metadata' : 'Link New Technical Document'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Document Name</label>
                      <input
                        type="text"
                        name="documentName"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        value={formData.documentName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small">File Path / URI</label>
                      <input
                        type="text"
                        name="filePath"
                        className="form-control bg-dark border-secondary text-light rounded-3"
                        placeholder="e.g. /docs/specification_v2.pdf"
                        value={formData.filePath}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small">Project Link</label>
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
                    <div className="col-6">
                      <label className="form-label text-secondary small">Uploaded By User</label>
                      <select
                        name="uploadedBy"
                        className="form-select bg-dark border-secondary text-light rounded-3"
                        value={formData.uploadedBy}
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
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Document Type</label>
                    <select
                      name="documentType"
                      className="form-select bg-dark border-secondary text-light rounded-3"
                      value={formData.documentType}
                      onChange={handleInputChange}
                    >
                      <option value="SPECIFICATION">SPECIFICATION</option>
                      <option value="ARCHITECTURE">ARCHITECTURE</option>
                      <option value="USER_GUIDE">USER_GUIDE</option>
                      <option value="API_DOCS">API_DOCS</option>
                      <option value="DEPLOYMENT_MANUAL">DEPLOYMENT_MANUAL</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-3 px-4">
                    {isEditing ? 'Save Changes' : 'Link Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {documentToDelete && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content bg-dark border-danger border-opacity-50 text-light rounded-4">
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDocumentToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete document <strong>{documentToDelete.documentName}</strong>?</p>
                <p className="text-secondary small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setDocumentToDelete(null)}>
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

export default DocumentsPage;

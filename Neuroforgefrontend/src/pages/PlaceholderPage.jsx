import React from 'react';

const PlaceholderPage = ({ title }) => {
  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm border-0 bg-dark text-light p-5 rounded-4">
        <h1 className="display-6 fw-bold mb-3">{title}</h1>
        <p className="text-secondary mb-4">
          This section is currently under development. The database connection and integration for this module are verified, and CRUD interface elements will be wired soon.
        </p>
        <div className="d-flex gap-2">
          <div className="spinner-grow text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="spinner-grow text-info" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;

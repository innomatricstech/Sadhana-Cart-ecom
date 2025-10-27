// ✅ src/components/ThankYou.jsx
import React from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ThankYou.css"; // optional CSS for styling

function ThankYou() {
  return (
    <div className="thankyou-container d-flex flex-column justify-content-center align-items-center text-center p-5">
      <div className="thankyou-card shadow-lg p-5 rounded bg-white">
        <div className="mb-4">
          <i className="fas fa-check-circle text-success" style={{ fontSize: "4rem" }}></i>
        </div>
        <h2 className="fw-bold mb-3">Thank You!</h2>
        <p className="lead text-muted mb-4">
          Your message has been successfully sent.  
          We’ll get back to you as soon as possible.
        </p>
        <Link to="/" className="btn btn-primary px-4">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default ThankYou;

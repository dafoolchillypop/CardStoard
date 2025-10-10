// src/components/Modal.jsx
import React from "react";
import "./Modal.css";

export default function Modal({ isOpen, title, message, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">
          {/* ✅ Glowing email check icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#007bff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon-mail-check"
          >
            <path d="M22 12v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            <polyline points="22 3 15 10 11 6" />
            <polyline points="16 17 21 12 23 14" />
          </svg>
        </div>

        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          {onConfirm && (
            <button className="nav-btn" onClick={onConfirm}>
              Continue
            </button>
          )}
          <button className="nav-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

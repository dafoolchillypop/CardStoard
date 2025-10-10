import React from "react";
import "./Modal.css";

export default function Modal({ isOpen, title, message, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
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

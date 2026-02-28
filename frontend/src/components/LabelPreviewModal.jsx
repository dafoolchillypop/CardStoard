// src/components/LabelPreviewModal.jsx
import React from "react";
import "./Modal.css";
import "./LabelPreviewModal.css";

export default function LabelPreviewModal({ labelData, onPrint, onClose }) {
  if (!labelData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box label-preview-box"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">Label Preview</h2>
        <p style={{ color: "#666", fontSize: "0.85rem", margin: "0 0 1rem" }}>
          Avery 6427 &mdash; 1.75&Prime; &times; 0.75&Prime;
        </p>

        {/* Label rendered at 3× scale */}
        <div className="label-preview">
          <img
            className="label-preview-qr"
            src={`data:image/png;base64,${labelData.qr_b64}`}
            alt="QR code"
          />
          <div className="label-preview-text">
            <span className="label-preview-id">{labelData.label_id}</span>
            <span className="label-preview-desc">{labelData.descriptor}</span>
            <span className="label-preview-grade">{labelData.grade}</span>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button className="nav-btn" onClick={onPrint}>
            Print Label
          </button>
          <button className="nav-btn secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

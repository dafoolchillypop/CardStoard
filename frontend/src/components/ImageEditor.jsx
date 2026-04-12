/**
 * components/ImageEditor.jsx
 * ---------------------------
 * Crop + rotate modal for card photos, used in BatchCapturePage.
 *
 * Props:
 *   file      — File object (from camera capture or file input)
 *   onSave    — callback(editedFile: File) — called with cropped JPEG
 *   onCancel  — callback() — user dismissed without saving
 *   title     — optional modal heading (e.g. "Edit Front Photo")
 *
 * Uses react-cropper (cropperjs v1 wrapper) for:
 *   - EXIF rotation handling (preserves phone portrait orientation)
 *   - Pinch-zoom / drag on mobile
 *   - Aspect ratio lock to standard card (2.5 × 3.5)
 *   - Rotate CW / CCW buttons
 */
import React, { useRef, useState, useEffect } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import "./ImageEditor.css";

export default function ImageEditor({ file, onSave, onCancel, title = "Edit Photo" }) {
  const cropperRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create an object URL for the file and revoke on cleanup
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const rotate = (deg) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.rotate(deg);
  };

  const handleReset = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.reset();
  };

  const handleSave = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    setSaving(true);
    cropper.getCroppedCanvas().toBlob(
      (blob) => {
        if (!blob) { setSaving(false); return; }
        const editedFile = new File([blob], file.name || "card-photo.jpg", { type: "image/jpeg" });
        onSave(editedFile);
        setSaving(false);
      },
      "image/jpeg",
      0.92
    );
  };

  if (!objectUrl) return null;

  return (
    <div className="image-editor-overlay" onClick={onCancel}>
      <div className="image-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-editor-header">
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>{title}</span>
          <button className="image-editor-close" onClick={onCancel} aria-label="Cancel">✕</button>
        </div>

        <div className="image-editor-crop-area">
          <Cropper
            ref={cropperRef}
            src={objectUrl}
            style={{ height: "100%", width: "100%" }}
            aspectRatio={2.5 / 3.5}
            viewMode={1}
            autoCropArea={0.9}
            rotatable={true}
            scalable={false}
            zoomable={true}
            guides={true}
            background={false}
            responsive={true}
          />
        </div>

        <div className="image-editor-controls">
          <button className="nav-btn secondary" onClick={() => rotate(-90)} title="Rotate counter-clockwise">
            ↺ CCW
          </button>
          <button className="nav-btn secondary" onClick={() => rotate(90)} title="Rotate clockwise">
            CW ↻
          </button>
          <button className="nav-btn secondary" onClick={handleReset} title="Reset crop and rotation">
            Reset
          </button>
          <div style={{ flex: 1 }} />
          <button className="nav-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="nav-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

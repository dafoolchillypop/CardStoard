/**
 * components/ImageEditor.jsx
 * ---------------------------
 * Crop + rotate + adjust modal for card photos, used in BatchCapturePage and ScanPage.
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
 *   - Aspect ratio lock to standard card (2.5 × 3.5) or landscape (3.5 × 2.5)
 *   - Rotate CW / CCW buttons
 *
 * Additional controls:
 *   - Portrait / Landscape toggle (updates aspect ratio live)
 *   - Brightness, Contrast, Saturation sliders (applied to export canvas)
 *   - Output always exported at 1500×2100 (portrait) or 2100×1500 (landscape)
 */
import React, { useRef, useState, useEffect } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import "./ImageEditor.css";

export default function ImageEditor({ file, onSave, onCancel, title = "Edit Photo" }) {
  const cropperRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [orientation, setOrientation] = useState("portrait");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

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

  const toggleOrientation = () => {
    setOrientation(prev => {
      const next = prev === "portrait" ? "landscape" : "portrait";
      cropperRef.current?.cropper?.setAspectRatio(next === "portrait" ? 2.5 / 3.5 : 3.5 / 2.5);
      return next;
    });
  };

  const handleReset = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.reset();
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleSave = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    setSaving(true);

    const targetW = orientation === "portrait" ? 1500 : 2100;
    const targetH = orientation === "portrait" ? 2100 : 1500;

    // Get natural-size crop first, then draw into a fixed-dimension canvas.
    // getCroppedCanvas width/height options don't reliably upscale in all cropperjs builds.
    const naturalCanvas = cropper.getCroppedCanvas();
    if (!naturalCanvas) { setSaving(false); return; }

    const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    const needsFilter = brightness !== 100 || contrast !== 100 || saturation !== 100;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext("2d");
    if (needsFilter) ctx.filter = filterStr;
    ctx.drawImage(naturalCanvas, 0, 0, targetW, targetH);

    exportCanvas.toBlob(  // always 1500×2100 (portrait) or 2100×1500 (landscape)
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

  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  return (
    <div className="image-editor-overlay" onClick={onCancel}>
      <div className="image-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-editor-header">
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>{title}</span>
          <button className="image-editor-close" onClick={onCancel} aria-label="Cancel">✕</button>
        </div>

        <div className="image-editor-crop-area">
          <div style={{ filter: filterStyle, height: "100%" }}>
            <Cropper
              ref={cropperRef}
              src={objectUrl}
              style={{ height: "100%", width: "100%" }}
              aspectRatio={2.5 / 3.5}
              viewMode={1}
              autoCropArea={0.6}
              rotatable={true}
              scalable={false}
              zoomable={true}
              guides={true}
              background={false}
              responsive={true}
              ready={() => {
                cropperRef.current?.cropper?.reset();
              }}
            />
          </div>
        </div>

        <div className="image-editor-adjustments">
          <label>
            Bright
            <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(+e.target.value)} />
          </label>
          <label>
            Contrast
            <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(+e.target.value)} />
          </label>
          <label>
            Sat
            <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(+e.target.value)} />
          </label>
        </div>

        <div className="image-editor-controls">
          <button className="nav-btn secondary" onClick={() => rotate(-90)} title="Rotate counter-clockwise">
            ↺ CCW
          </button>
          <button className="nav-btn secondary" onClick={() => rotate(90)} title="Rotate clockwise">
            CW ↻
          </button>
          <button className="nav-btn secondary" onClick={handleReset} title="Reset crop, rotation, and adjustments">
            Reset
          </button>
          <button className="nav-btn secondary" onClick={toggleOrientation} title="Toggle portrait/landscape">
            {orientation === "portrait" ? "↔ Landscape" : "↕ Portrait"}
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

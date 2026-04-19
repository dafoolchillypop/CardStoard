/**
 * pages/ScanPage.jsx
 * ------------------
 * Two-tab AI-powered scan page. Gated by settings.enable_image_ai.
 *
 * Tab 1 — Identify Card
 *   Upload or capture a photo → Claude Vision extracts fields → editable results →
 *   optional grade estimate → dictionary book values → collection duplicate check →
 *   Add to Collection (with optional save-photo-as-front-image)
 *
 * Tab 2 — Scan QR Code
 *   Browser camera QR decode via html5-qrcode → navigate to decoded URL path.
 *   Manual URL/ID fallback input.
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import ImageEditor from "../components/ImageEditor";

const GRADE_LABELS = {
  3.0: "MT",
  1.5: "EX",
  1.0: "VG",
  0.8: "GD",
  0.4: "FR",
  0.2: "PR",
};

const VALID_GRADES = [3.0, 1.5, 1.0, 0.8, 0.4, 0.2];

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 75 ? "#28a745" : pct >= 50 ? "#ffc107" : "#dc3545";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
      <div style={{ flex: 1, height: 8, background: "#e9ecef", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "0.8rem", color, fontWeight: 600, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("identify");
  const [settings, setSettings] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // --- Identify tab state ---
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState(null);
  const [identifyError, setIdentifyError] = useState(null);
  const [includeGrade, setIncludeGrade] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [addGrade, setAddGrade] = useState(1.0);
  const [savePhoto, setSavePhoto] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);
  const [dictMatch, setDictMatch] = useState(null);
  const [dictLookupPending, setDictLookupPending] = useState(false);

  // --- Camera capture state ---
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [editorFile, setEditorFile] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --- QR tab state ---
  const [qrDecodeError, setQrDecodeError] = useState(null);
  const [manualQr, setManualQr] = useState("");
  const qrScannerRef = useRef(null);
  const qrDivId = "cs-qr-reader";

  useEffect(() => {
    api.get("/settings/")
      .then(res => { setSettings(res.data); setSettingsLoaded(true); })
      .catch(() => setSettingsLoaded(true));
  }, []);

  // Stop QR scanner and camera when leaving QR tab
  useEffect(() => {
    if (activeTab !== "qr") {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(() => {});
        qrScannerRef.current = null;
      }
    }
    // Stop camera stream whenever tab changes
    stopCamera();
  }, [activeTab]);

  // Start QR scanner when QR tab becomes active
  useEffect(() => {
    if (activeTab !== "qr") return;
    let mounted = true;
    import("html5-qrcode")
      .then(({ Html5QrcodeScanner }) => {
        if (!mounted || qrScannerRef.current) return;
        const scanner = new Html5QrcodeScanner(
          qrDivId,
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          false
        );
        scanner.render(
          (text) => { if (mounted) handleQrDecode(text); },
          () => {}
        );
        qrScannerRef.current = scanner;
      })
      .catch(() => {
        if (mounted) setQrDecodeError("QR scanner unavailable. Make sure html5-qrcode is installed.");
      });
    return () => {
      mounted = false;
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(() => {});
        qrScannerRef.current = null;
      }
    };
  }, [activeTab]);

  const handleQrDecode = (text) => {
    try {
      let path;
      if (text.startsWith("http")) {
        const url = new URL(text);
        path = url.pathname + url.search;
      } else {
        path = text;
      }
      navigate(path);
    } catch {
      setQrDecodeError(`Could not parse QR code: ${text}`);
    }
  };

  const handleManualQr = () => {
    if (!manualQr.trim()) return;
    handleQrDecode(manualQr.trim());
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 4096 }, height: { ideal: 4096 } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access denied or not available.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      stopCamera();
      setEditorFile(file);
    }, "image/jpeg", 0.92);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEditorFile(f);
    setIdentifyResult(null);
    setIdentifyError(null);
    setEditedFields({});
    setAddResult(null);
  };

  const handleEditorSave = (editedFile) => {
    setEditorFile(null);
    setImageFile(editedFile);
    setImagePreview(URL.createObjectURL(editedFile));
    setIdentifyResult(null);
    setIdentifyError(null);
    setEditedFields({});
    setAddResult(null);
  };

  const handleEditorCancel = () => setEditorFile(null);

  const handleIdentify = async () => {
    if (!imageFile) return;
    setIdentifying(true);
    setIdentifyError(null);
    setIdentifyResult(null);
    setEditedFields({});
    setAddResult(null);
    try {
      const form = new FormData();
      form.append("file", imageFile);
      const res = await api.post(
        `/cards/identify-image?include_grade=${includeGrade}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setIdentifyResult(res.data);
      setDictMatch(res.data.dictionary_match ?? null);
      const f = res.data.fields || {};
      setEditedFields({
        first_name: f.first_name || "",
        last_name: f.last_name || "",
        year: f.year || "",
        brand: f.brand || "",
        card_number: f.card_number || "",
      });
      // Pre-fill grade from estimate if available
      if (res.data.grade_estimate?.grade && VALID_GRADES.includes(res.data.grade_estimate.grade)) {
        setAddGrade(res.data.grade_estimate.grade);
      } else {
        setAddGrade(settings?.card_grades?.[0] ? parseFloat(settings.card_grades[0]) : 1.0);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setIdentifyError(detail || "Identification failed. Please try again.");
    } finally {
      setIdentifying(false);
    }
  };

  useEffect(() => {
    const firstName = editedFields.first_name?.trim();
    const lastName  = editedFields.last_name?.trim();
    if (!firstName || !lastName) return;

    const params = { first_name: firstName, last_name: lastName };
    if (editedFields.brand) params.brand = editedFields.brand.trim();
    if (editedFields.year && !isNaN(Number(editedFields.year))) params.year = Number(editedFields.year);

    setDictLookupPending(true);

    const timer = setTimeout(async () => {
      try {
        let cardNum = editedFields.card_number?.trim() || "";

        // Call 1 — get canonical card_number when not set by user
        if (!cardNum) {
          const res = await api.get("/cards/smart-fill", { params });
          if (res.data.status === "ok" && res.data.fields.card_number) {
            cardNum = res.data.fields.card_number;
            setEditedFields(prev => ({ ...prev, card_number: cardNum }));
          }
        }

        // Call 2 — get book values with card_number pinned
        if (cardNum) {
          const res2 = await api.get("/cards/smart-fill", { params: { ...params, card_number: cardNum } });
          if (res2.data.status === "ok") {
            const f = res2.data.fields;
            setDictMatch({
              found: true,
              book_high:     f.book_high     ?? null,
              book_high_mid: f.book_high_mid ?? null,
              book_mid:      f.book_mid      ?? null,
              book_low_mid:  f.book_low_mid  ?? null,
              book_low:      f.book_low      ?? null,
            });
          } else {
            setDictMatch({ found: false });
          }
        } else {
          setDictMatch({ found: false });
        }
      } catch (err) {
        console.error("Dictionary re-lookup error:", err);
      } finally {
        setDictLookupPending(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editedFields.first_name, editedFields.last_name, editedFields.brand, editedFields.year, editedFields.card_number]);

  const handleAddToCollection = async () => {
    if (!identifyResult) return;
    setAdding(true);
    try {
      const payload = {
        first_name: editedFields.first_name || "Unknown",
        last_name: editedFields.last_name || "Unknown",
        year: editedFields.year ? parseInt(editedFields.year) : null,
        brand: editedFields.brand || null,
        card_number: editedFields.card_number || null,
        grade: addGrade,
        // Pre-fill book values from live dict match (falls back to original scan result)
        ...(() => {
          const dm = dictMatch ?? identifyResult.dictionary_match;
          return {
            ...(dm?.book_high     != null && { book_high:     dm.book_high }),
            ...(dm?.book_high_mid != null && { book_high_mid: dm.book_high_mid }),
            ...(dm?.book_mid      != null && { book_mid:      dm.book_mid }),
            ...(dm?.book_low_mid  != null && { book_low_mid:  dm.book_low_mid }),
            ...(dm?.book_low      != null && { book_low:      dm.book_low }),
          };
        })(),
      };
      const cardRes = await api.post("/cards/", payload);
      const newCardId = cardRes.data.id;

      // Upload photo as front image if requested
      if (savePhoto && imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        await api.post(`/cards/${newCardId}/upload-front`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setAddResult({ success: true, cardId: newCardId });
    } catch (err) {
      setAddResult({ success: false, error: err.response?.data?.detail || "Failed to add card." });
    } finally {
      setAdding(false);
    }
  };

  const resetIdentify = () => {
    setImageFile(null);
    setImagePreview(null);
    setIdentifyResult(null);
    setIdentifyError(null);
    setEditedFields({});
    setAddResult(null);
    setDictMatch(null);
    setDictLookupPending(false);
  };

  // --- Render ---
  if (!settingsLoaded) {
    return (
      <>
        <AppHeader />
        <div className="container" style={{ textAlign: "center", marginTop: "3rem" }}>
          <div className="cs-spinner" />
        </div>
      </>
    );
  }

  const isEnabled = settings?.enable_image_ai === true;

  const tabBtnStyle = (tab) => ({
    padding: "0.5rem 1.5rem",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    border: "none",
    borderBottom: activeTab === tab ? "3px solid var(--accent-blue, #1976d2)" : "3px solid transparent",
    background: "transparent",
    color: activeTab === tab ? "var(--accent-blue, #1976d2)" : "var(--text-muted, #888)",
    marginBottom: "-1px",
  });

  const inp = {
    fontSize: "0.9rem",
    padding: "0.4rem 0.6rem",
    borderRadius: 6,
    border: "1px solid var(--border, #ccc)",
    background: "var(--bg-input, #fff)",
    color: "var(--text-primary, #222)",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <>
      <AppHeader />
      <div className="container" style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
        <h2 className="page-header">Scan</h2>

        {!isEnabled && (
          <div className="card-section" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
              Image AI is not enabled.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Enable it in <button className="nav-btn secondary" style={{ display: "inline", padding: "0.2rem 0.6rem" }} onClick={() => navigate("/admin")}>Admin Settings</button> → Features → Image AI.
            </p>
          </div>
        )}

        {isEnabled && (
          <>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border, #ddd)", marginBottom: "1.5rem" }}>
              <button style={tabBtnStyle("identify")} onClick={() => setActiveTab("identify")}>
                📷 Identify Card
              </button>
              <button style={tabBtnStyle("qr")} onClick={() => setActiveTab("qr")}>
                📱 Scan QR Code
              </button>
            </div>

            {/* ===================== TAB 1: Identify ===================== */}
            {activeTab === "identify" && (
              <div>
                {/* Upload area */}
                {!identifyResult && (
                  <div className="card-section" style={{ textAlign: "center" }}>
                    {/* Camera preview overlay */}
                    {showCamera && (
                      <div style={{ marginBottom: "1rem" }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          style={{ width: "100%", maxHeight: 320, borderRadius: 8, background: "#000", objectFit: "contain" }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
                          <button className="nav-btn" onClick={capturePhoto}>📸 Snap</button>
                          <button className="nav-btn secondary" onClick={stopCamera}>✕ Cancel</button>
                        </div>
                      </div>
                    )}

                    {!showCamera && (
                      <label style={{ display: "block", cursor: "pointer" }}>
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Card preview"
                            style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, objectFit: "contain", border: "2px solid var(--border, #ddd)" }}
                          />
                        ) : (
                          <div style={{
                            border: "2px dashed var(--border, #ccc)",
                            borderRadius: 12,
                            padding: "2.5rem 1rem",
                            color: "var(--text-muted)",
                            fontSize: "1.1rem",
                          }}>
                            📂 Choose a photo
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleFileChange}
                        />
                      </label>
                    )}

                    {cameraError && (
                      <p style={{ color: "#dc3545", fontSize: "0.9rem", marginTop: "0.5rem" }}>{cameraError}</p>
                    )}

                    {!showCamera && !imagePreview && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <button className="nav-btn" onClick={startCamera} style={{ fontSize: "0.9rem" }}>
                          📷 Use Camera
                        </button>
                      </div>
                    )}

                    {imagePreview && (
                      <button
                        className="nav-btn secondary"
                        style={{ marginTop: "0.5rem", fontSize: "0.8rem", padding: "0.2rem 0.6rem" }}
                        onClick={resetIdentify}
                      >
                        ✕ Clear
                      </button>
                    )}

                    <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={includeGrade}
                          onChange={e => setIncludeGrade(e.target.checked)}
                        />
                        Include condition assessment
                      </label>
                      <button
                        className="nav-btn"
                        disabled={!imageFile || identifying}
                        onClick={handleIdentify}
                        style={{ minWidth: 120 }}
                      >
                        {identifying ? "Identifying…" : "🔍 Identify"}
                      </button>
                    </div>

                    {identifyError && (
                      <p style={{ color: "#dc3545", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                        {identifyError}
                      </p>
                    )}
                  </div>
                )}

                {/* Results panel */}
                {identifyResult && (
                  <div>
                    {/* Confidence */}
                    <div className="card-section" style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "0.95rem" }}>Confidence</strong>
                        <button
                          className="nav-btn secondary"
                          style={{ fontSize: "0.8rem", padding: "0.2rem 0.7rem" }}
                          onClick={resetIdentify}
                        >
                          ↩ New Photo
                        </button>
                      </div>
                      <ConfidenceBar value={identifyResult.confidence} />
                    </div>

                    {/* Editable fields */}
                    <div className="card-section" style={{ marginBottom: "1rem" }}>
                      <strong style={{ fontSize: "0.95rem" }}>Extracted Fields</strong>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.75rem" }}>
                        {[
                          ["first_name", "First Name"],
                          ["last_name", "Last Name"],
                          ["year", "Year"],
                          ["brand", "Brand"],
                          ["card_number", "Card #"],
                        ].map(([field, label]) => (
                          <div key={field} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>{label}</label>
                            <input
                              style={inp}
                              value={editedFields[field] ?? ""}
                              onChange={e => setEditedFields(prev => ({ ...prev, [field]: e.target.value }))}
                              placeholder={`${label} (not detected)`}
                            />
                          </div>
                        ))}
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Grade</label>
                          <select
                            style={inp}
                            value={addGrade}
                            onChange={e => setAddGrade(parseFloat(e.target.value))}
                          >
                            {VALID_GRADES.map(g => (
                              <option key={g} value={g}>{g} — {GRADE_LABELS[g]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Grade estimate */}
                    {identifyResult.grade_estimate && (
                      <div className="card-section" style={{ marginBottom: "1rem" }}>
                        <strong style={{ fontSize: "0.95rem" }}>Condition Estimate</strong>
                        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                          <span style={{
                            background: "#1976d2", color: "#fff",
                            borderRadius: 20, padding: "0.25rem 0.85rem",
                            fontWeight: 700, fontSize: "1rem",
                          }}>
                            {identifyResult.grade_estimate.grade_label} ({identifyResult.grade_estimate.grade})
                          </span>
                          {identifyResult.grade_estimate.condition_notes && (
                            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", flex: 1 }}>
                              {identifyResult.grade_estimate.condition_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dictionary match — live result takes precedence over initial scan result */}
                    {(() => {
                      const dm = dictMatch ?? identifyResult.dictionary_match;
                      return dm?.found &&
                        (dm.book_high != null || dm.book_mid != null || dm.book_low != null) ? (
                        <div className="card-section" style={{ marginBottom: "1rem", background: "var(--bg-success-light, #f0fff4)" }}>
                          <strong style={{ fontSize: "0.95rem" }}>📖 Dictionary Match — Book Values</strong>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                            {[
                              ["book_high",     "H",  "book-high"],
                              ["book_high_mid", "HM", "book-highmid"],
                              ["book_mid",      "M",  "book-mid"],
                              ["book_low_mid",  "LM", "book-lowmid"],
                              ["book_low",      "L",  "book-low"],
                            ].map(([field, label, cls]) =>
                              dm[field] != null ? (
                                <span key={field} className={`book-badge ${cls}`} title={label}>
                                  {label}: ${dm[field]}
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {dictLookupPending && (
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        Searching dictionary…
                      </p>
                    )}

                    {/* Collection match */}
                    {identifyResult.collection_match?.found && (
                      <div className="card-section" style={{ marginBottom: "1rem", background: "var(--bg-warn-light, #fffbf0)" }}>
                        <strong style={{ fontSize: "0.95rem" }}>
                          ⚠️ Already in Collection ({identifyResult.collection_match.duplicate_count}{" "}
                          {identifyResult.collection_match.duplicate_count === 1 ? "copy" : "copies"})
                        </strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                          {identifyResult.collection_match.cards.slice(0, 5).map(c => (
                            <button
                              key={c.id}
                              className="nav-btn secondary"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem" }}
                              onClick={() => navigate(`/card-detail/${c.id}`)}
                            >
                              {c.year} {c.brand}{c.card_number ? ` #${c.card_number}` : ""} Grade {c.grade}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add to collection */}
                    {!addResult && (
                      <div className="card-section">
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer", marginBottom: "0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={savePhoto}
                            onChange={e => setSavePhoto(e.target.checked)}
                          />
                          Save this photo as the card's front image
                        </label>
                        <button
                          className="nav-btn"
                          disabled={adding}
                          onClick={handleAddToCollection}
                          style={{ width: "100%", padding: "0.6rem" }}
                        >
                          {adding ? "Adding…" : "＋ Add to Collection"}
                        </button>
                      </div>
                    )}

                    {addResult?.success && (
                      <div className="card-section" style={{ textAlign: "center", background: "var(--bg-success-light, #f0fff4)" }}>
                        <p style={{ color: "#28a745", fontWeight: 700, margin: "0 0 0.5rem" }}>Card added!</p>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                          <button className="nav-btn" onClick={() => navigate("/list-cards", { state: { scrollToCardId: addResult.cardId } })}>
                            View in My Cards
                          </button>
                          <button className="nav-btn secondary" onClick={resetIdentify}>
                            Scan Another
                          </button>
                        </div>
                      </div>
                    )}

                    {addResult?.success === false && (
                      <p style={{ color: "#dc3545", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        {addResult.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===================== TAB 2: QR Scanner ===================== */}
            {activeTab === "qr" && (
              <div>
                <div className="card-section" style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 0 }}>
                    Point your camera at a CardStoard QR label to navigate directly to that item.
                  </p>
                  {qrDecodeError && (
                    <p style={{ color: "#dc3545", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      {qrDecodeError}
                    </p>
                  )}
                  {/* html5-qrcode renders into this div */}
                  <div id={qrDivId} style={{ width: "100%" }} />
                </div>

                {/* Manual fallback */}
                <div className="card-section">
                  <strong style={{ fontSize: "0.9rem" }}>Manual URL / Path</strong>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <input
                      style={{ ...inp, flex: 1 }}
                      placeholder="e.g. /card-view/42 or https://…"
                      value={manualQr}
                      onChange={e => setManualQr(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleManualQr(); }}
                    />
                    <button className="nav-btn" onClick={handleManualQr} style={{ whiteSpace: "nowrap" }}>
                      Go →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editorFile && (
        <ImageEditor file={editorFile} onSave={handleEditorSave} onCancel={handleEditorCancel} title="Adjust Photo" />
      )}
    </>
  );
}

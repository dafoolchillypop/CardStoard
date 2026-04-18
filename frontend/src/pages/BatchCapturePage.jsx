/**
 * pages/BatchCapturePage.jsx
 * ---------------------------
 * Batch photo capture session — step through cards one at a time,
 * capture front + back photos, handle duplicates, and save to DB.
 *
 * Phases: setup → queue → capture → resolution → summary
 *
 * Session state is persisted to localStorage so the session survives
 * page close and can be resumed.
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import ImageEditor from "../components/ImageEditor";

const SESSION_KEY = "cs_batch_session";

const GRADE_LABELS = {
  3.0: "MT", 1.5: "NM/MT", 1.0: "EX/MT", 0.8: "VG/EX", 0.4: "GD", 0.2: "PR",
};

// Build a duplicate-detection key for a card
function dupeKey(card) {
  return [
    (card.first_name || "").toLowerCase().trim(),
    (card.last_name  || "").toLowerCase().trim(),
    card.year || 0,
    (card.brand       || "").toLowerCase().trim(),
    (card.card_number || "").toLowerCase().trim(),
  ].join("|");
}

// Apply filter + sort to a list of cards and return queue items
function buildQueue(cards, filter, sortBy) {
  let filtered = cards;
  if (filter === "missing") {
    filtered = cards.filter(c => !c.front_image || !c.back_image);
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "year")        return (a.year || 0) - (b.year || 0);
    if (sortBy === "brand")       return (a.brand || "").localeCompare(b.brand || "");
    if (sortBy === "card_number") return (a.card_number || "").localeCompare(b.card_number || "");
    // default: player (last, first)
    const lc = (a.last_name || "").localeCompare(b.last_name || "");
    return lc !== 0 ? lc : (a.first_name || "").localeCompare(b.first_name || "");
  });

  return sorted.map(c => ({
    ...c,
    done:     false,
    skipped:  false,
    frontUrl: c.front_image || null,
    backUrl:  c.back_image  || null,
  }));
}

// Detect duplicate groups → { [key]: [queueIndexes] }
function detectDupeGroups(queue) {
  const groups = {};
  queue.forEach((item, idx) => {
    const k = dupeKey(item);
    if (!groups[k]) groups[k] = [];
    groups[k].push(idx);
  });
  // Keep only groups with 2+ members
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length >= 2));
}

export default function BatchCapturePage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("setup");
  const [filter, setFilter] = useState("missing");
  const [sortBy, setSortBy] = useState("player");
  const [allCards, setAllCards] = useState([]);
  const [fetchingCards, setFetchingCards] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [dupeGroups, setDupeGroups] = useState({});
  const [resumeData, setResumeData] = useState(null);

  // Camera
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturingSide, setCapturingSide] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ImageEditor
  const [editorFile, setEditorFile] = useState(null);
  const [editorSide, setEditorSide] = useState(null);

  // Upload state
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Resolution screen — swapping photos between duplicate cards
  const [swapLoading, setSwapLoading] = useState(null); // "A-B" while swapping

  useEffect(() => {
    loadAllCards();
    // Check for a saved session
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (saved && Array.isArray(saved.queue) && saved.queue.length > 0) {
        setResumeData(saved);
      }
    } catch { /* ignore */ }
  }, []);

  const loadAllCards = async () => {
    setFetchingCards(true);
    setFetchError(null);
    try {
      const res = await api.get("/cards/", { params: { skip: 0, limit: 10000 } });
      setAllCards(res.data);
    } catch (err) {
      setFetchError("Failed to load cards: " + (err.response?.data?.detail || err.message));
    } finally {
      setFetchingCards(false);
    }
  };

  const saveSession = (updatedQueue, updatedCursor) => {
    const slim = updatedQueue.map(({ id, done, skipped, frontUrl, backUrl }) =>
      ({ id, done, skipped, frontUrl, backUrl })
    );
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        filter, sortBy, queue: slim, cursor: updatedCursor,
      }));
    } catch { /* quota exceeded — ignore */ }
  };

  const clearSession = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  };

  // ── Setup screen: start a fresh session ──
  const handleStartSession = () => {
    const q = buildQueue(allCards, filter, sortBy);
    if (q.length === 0) return;
    const groups = detectDupeGroups(q);
    setQueue(q);
    setCursor(0);
    setDupeGroups(groups);
    setResumeData(null);
    clearSession();
    saveSession(q, 0);
    setPhase("queue");
  };

  // ── Resume saved session ──
  const handleResume = () => {
    if (!resumeData) return;
    // Re-fetch cards by ID to rebuild full queue items
    const savedItems = resumeData.queue;
    const cardMap = Object.fromEntries(allCards.map(c => [c.id, c]));
    const q = savedItems.map(saved => {
      const card = cardMap[saved.id] || { id: saved.id, first_name: "?", last_name: "?" };
      return { ...card, done: saved.done, skipped: saved.skipped, frontUrl: saved.frontUrl, backUrl: saved.backUrl };
    });
    const groups = detectDupeGroups(q);
    setQueue(q);
    setCursor(resumeData.cursor || 0);
    setDupeGroups(groups);
    setFilter(resumeData.filter || "missing");
    setSortBy(resumeData.sortBy || "player");
    setResumeData(null);
    setPhase("queue");
  };

  // ── Queue: move item up/down ──
  const moveItem = (idx, dir) => {
    const newQ = [...queue];
    const swap = idx + dir;
    if (swap < 0 || swap >= newQ.length) return;
    [newQ[idx], newQ[swap]] = [newQ[swap], newQ[idx]];
    setQueue(newQ);
    setDupeGroups(detectDupeGroups(newQ));
    saveSession(newQ, cursor);
  };

  // ── Queue: begin capture ──
  const handleBeginCapture = () => {
    setCursor(0);
    setPhase("capture");
  };

  // ── Camera ──
  const startCamera = async (side) => {
    setCameraError(null);
    setCapturingSide(side);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access denied or unavailable.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
    setCapturingSide(null);
  };

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      setEditorFile(file);
      setEditorSide(capturingSide);
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  // ── File upload from file input (alternative to camera) ──
  const handleFileInput = (e, side) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEditorFile(f);
    setEditorSide(side);
    e.target.value = ""; // reset so same file can be re-selected
  };

  // ── After ImageEditor saves ──
  const handleEditorSave = async (editedFile) => {
    const side = editorSide;
    setEditorFile(null);
    setEditorSide(null);
    setUploadError(null);

    const card = queue[cursor];
    if (!card) return;

    const form = new FormData();
    form.append("file", editedFile);

    if (side === "front") {
      setUploadingFront(true);
      try {
        const res = await api.post(`/cards/${card.id}/upload-front`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updateQueueItem(cursor, { frontUrl: res.data.front_image });
      } catch (err) {
        setUploadError("Upload failed: " + (err.response?.data?.detail || err.message));
      } finally {
        setUploadingFront(false);
      }
    } else {
      setUploadingBack(true);
      try {
        const res = await api.post(`/cards/${card.id}/upload-back`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updateQueueItem(cursor, { backUrl: res.data.back_image });
      } catch (err) {
        setUploadError("Upload failed: " + (err.response?.data?.detail || err.message));
      } finally {
        setUploadingBack(false);
      }
    }
  };

  const handleEditorCancel = () => {
    setEditorFile(null);
    setEditorSide(null);
  };

  const updateQueueItem = (idx, patch) => {
    setQueue(prev => {
      const newQ = [...prev];
      newQ[idx] = { ...newQ[idx], ...patch };
      saveSession(newQ, cursor);
      return newQ;
    });
  };

  // ── Advance ──
  const handleAdvance = (skip = false) => {
    setUploadError(null);
    const updated = [...queue];
    updated[cursor] = { ...updated[cursor], done: !skip, skipped: skip };
    const nextCursor = cursor + 1;
    setQueue(updated);

    if (nextCursor >= updated.length) {
      // Session complete
      saveSession(updated, nextCursor);
      const hasDupes = Object.keys(dupeGroups).length > 0 &&
        Object.values(dupeGroups).some(idxs =>
          idxs.filter(i => updated[i].frontUrl).length >= 2
        );
      if (hasDupes) {
        setPhase("resolution");
      } else {
        finishSession(updated);
      }
    } else {
      setCursor(nextCursor);
      saveSession(updated, nextCursor);
    }
  };

  const finishSession = (finalQueue) => {
    const captured = finalQueue.filter(i => i.done).length;
    const skipped  = finalQueue.filter(i => i.skipped).length;
    const dupes    = Object.keys(dupeGroups).length;
    setQueue(finalQueue);
    setPhase("summary");
    clearSession();
    // Store stats in state via queue length (derived in render)
  };

  // ── Duplicate resolution: swap front photos between two queue items ──
  const handleSwapFront = async (idxA, idxB) => {
    const cardA = queue[idxA];
    const cardB = queue[idxB];
    if (!cardA.frontUrl || !cardB.frontUrl) return;
    const key = `${idxA}-${idxB}`;
    setSwapLoading(key);
    setUploadError(null);

    try {
      // Build absolute URLs for fetching (images are served from the backend)
      const baseUrl = process.env.REACT_APP_API_BASE ||
        (window.location.hostname === "localhost" ? "http://localhost:8000" : "https://cardstoard.com/api");
      // front_image is like "/static/cards/..."
      // In dev: proxy is http://localhost:8000; in prod: https://cardstoard.com/api + /static/...
      // Use window.location.origin for static assets in production, backend for dev
      const makeUrl = (relPath) => {
        const cleanPath = relPath.split("?")[0]; // strip any cache-busting params
        if (window.location.hostname === "localhost") {
          return "http://localhost:8000" + cleanPath;
        }
        return "https://cardstoard.com" + cleanPath;
      };

      const [respA, respB] = await Promise.all([
        fetch(makeUrl(cardA.frontUrl), { credentials: "include" }),
        fetch(makeUrl(cardB.frontUrl), { credentials: "include" }),
      ]);
      const [blobA, blobB] = await Promise.all([respA.blob(), respB.blob()]);

      const fileA = new File([blobA], "card-photo.jpg", { type: "image/jpeg" });
      const fileB = new File([blobB], "card-photo.jpg", { type: "image/jpeg" });

      const formA = new FormData();
      formA.append("file", fileA);
      const formB = new FormData();
      formB.append("file", fileB);

      const [resB, resA] = await Promise.all([
        api.post(`/cards/${cardB.id}/upload-front`, formA, { headers: { "Content-Type": "multipart/form-data" } }),
        api.post(`/cards/${cardA.id}/upload-front`, formB, { headers: { "Content-Type": "multipart/form-data" } }),
      ]);

      // Update queue with swapped URLs — append timestamp to bust browser cache
      const t = Date.now();
      setQueue(prev => {
        const newQ = [...prev];
        newQ[idxA] = { ...newQ[idxA], frontUrl: `${resA.data.front_image}?t=${t}` };
        newQ[idxB] = { ...newQ[idxB], frontUrl: `${resB.data.front_image}?t=${t}` };
        return newQ;
      });
    } catch (err) {
      setUploadError("Swap failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSwapLoading(null);
    }
  };

  // ── Helpers ──
  const filteredCount = allCards.filter(c =>
    filter === "missing" ? (!c.front_image || !c.back_image) : true
  ).length;

  const currentCard = queue[cursor];
  const isDupeCard = (idx) => {
    if (!queue[idx]) return false;
    const k = dupeKey(queue[idx]);
    return dupeGroups[k] && dupeGroups[k].length >= 2;
  };

  const gradeLabel = (g) => GRADE_LABELS[g] || String(g);
  const cardTitle  = (c) => `${c.year || "?"} ${c.brand || "?"} ${c.first_name || ""} ${c.last_name || ""}`.trim();
  const cardSub    = (c) => [c.card_number ? `#${c.card_number}` : null, gradeLabel(c.grade)].filter(Boolean).join(" · ");

  const inp = {
    fontSize: "0.9rem",
    padding: "0.35rem 0.6rem",
    borderRadius: 6,
    border: "1px solid var(--border, #ccc)",
    background: "var(--bg-input, #fff)",
    color: "var(--text-primary, #222)",
  };

  // ═══════════════════════════════════════════════
  //  Render helpers
  // ═══════════════════════════════════════════════

  const renderSetup = () => (
    <div>
      {resumeData && (
        <div className="card-section" style={{ marginBottom: "1rem", background: "var(--bg-warn-light, #fffbf0)", color: "#7a5c00", border: "1px solid #f0c040" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>
            You have a saved session ({resumeData.queue.length} cards, cursor at {resumeData.cursor}).
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="nav-btn" onClick={handleResume} disabled={fetchingCards}>
              Resume Session
            </button>
            <button className="nav-btn secondary" onClick={() => { clearSession(); setResumeData(null); }}>
              Discard & Start New
            </button>
          </div>
        </div>
      )}

      <div className="card-section">
        <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Session Setup</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Filter Cards
            </label>
            <select style={{ ...inp, width: "100%" }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="missing">Missing photos</option>
              <option value="all">All cards</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Sort By
            </label>
            <select style={{ ...inp, width: "100%" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="player">Player name</option>
              <option value="year">Year</option>
              <option value="brand">Brand</option>
              <option value="card_number">Card #</option>
            </select>
          </div>
        </div>

        {fetchingCards ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Loading cards…</p>
        ) : fetchError ? (
          <p style={{ color: "#dc3545", textAlign: "center" }}>{fetchError}</p>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem" }}>
              {filteredCount} card{filteredCount !== 1 ? "s" : ""} selected
            </p>
            <button
              className="nav-btn"
              disabled={filteredCount === 0}
              onClick={handleStartSession}
              style={{ minWidth: 160, fontSize: "1rem", padding: "0.6rem 1.5rem" }}
            >
              Start Session →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderQueue = () => {
    const dupeKeySet = new Set(
      Object.entries(dupeGroups)
        .filter(([, v]) => v.length >= 2)
        .map(([k]) => k)
    );

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>Queue — {queue.length} cards</h3>
          <button className="nav-btn" onClick={handleBeginCapture} style={{ fontSize: "0.95rem" }}>
            Begin Capture →
          </button>
        </div>

        {Object.keys(dupeGroups).length > 0 && (
          <div className="card-section" style={{ marginBottom: "1rem", background: "var(--bg-warn-light, #fffbf0)", fontSize: "0.88rem", color: "#7a5c00", border: "1px solid #f0c040" }}>
            <strong>⚠ {Object.keys(dupeGroups).length} duplicate group{Object.keys(dupeGroups).length > 1 ? "s" : ""} detected.</strong>{" "}
            Reorder cards to match your physical stack. Photos will be assigned in queue order.
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
              {Object.values(dupeGroups).map((idxs, i) => (
                <li key={i}>
                  {cardTitle(queue[idxs[0]])} — {idxs.length} copies (queue positions: {idxs.map(n => n + 1).join(", ")})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "60vh", overflowY: "auto" }}>
          {queue.map((item, idx) => {
            const k = dupeKey(item);
            const isDupe = dupeKeySet.has(k);
            return (
              <div key={item.id} className="card-section" style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.5rem 0.75rem",
                marginBottom: 0,
              }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", minWidth: 28 }}>
                  {idx + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {isDupe && <span title="Duplicate group" style={{ marginRight: "0.35rem" }}>⚠</span>}
                    {cardTitle(item)}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {cardSub(item)}
                    {item.frontUrl && <span style={{ marginLeft: "0.4rem", color: "#28a745" }}>▪ front</span>}
                    {item.backUrl  && <span style={{ marginLeft: "0.3rem", color: "#28a745" }}>▪ back</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: "0.75rem", opacity: idx === 0 ? 0.3 : 1, padding: "2px 4px" }}
                  >▲</button>
                  <button
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === queue.length - 1}
                    style={{ background: "none", border: "none", cursor: idx === queue.length - 1 ? "default" : "pointer", fontSize: "0.75rem", opacity: idx === queue.length - 1 ? 0.3 : 1, padding: "2px 4px" }}
                  >▼</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button className="nav-btn" onClick={handleBeginCapture} style={{ fontSize: "0.95rem" }}>
            Begin Capture →
          </button>
        </div>
      </div>
    );
  };

  const renderCapture = () => {
    if (!currentCard) return null;
    const k = dupeKey(currentCard);
    const isDupe = dupeGroups[k] && dupeGroups[k].length >= 2;
    const dupeGroupIdxs = isDupe ? dupeGroups[k] : [];
    const isFirstInDupeGroup = isDupe && dupeGroupIdxs[0] === cursor;
    const bothDone = currentCard.frontUrl && currentCard.backUrl;

    return (
      <div>
        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1, height: 6, background: "var(--bg-muted, #e0e0e0)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(cursor / queue.length) * 100}%`, height: "100%", background: "var(--accent-blue, #1976d2)", transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {cursor + 1} / {queue.length}
          </span>
        </div>

        {/* Duplicate group banner */}
        {isFirstInDupeGroup && (
          <div className="card-section" style={{ marginBottom: "1rem", background: "var(--bg-warn-light, #fffbf0)", fontSize: "0.88rem", color: "#7a5c00", border: "1px solid #f0c040" }}>
            ⚠ <strong>Duplicate group ({dupeGroupIdxs.length} copies)</strong> — shoot in queue order.
            You can swap photo assignments after the session.
          </div>
        )}
        {isDupe && !isFirstInDupeGroup && (
          <div style={{ fontSize: "0.82rem", color: "#856404", background: "var(--bg-warn-light, #fffbf0)", padding: "0.35rem 0.65rem", borderRadius: 6, marginBottom: "1rem" }}>
            ⚠ Duplicate card (group of {dupeGroupIdxs.length})
          </div>
        )}

        {/* Card info */}
        <div className="card-section" style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{cardTitle(currentCard)}</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            {cardSub(currentCard)}
            {currentCard.notes && <div style={{ marginTop: "0.25rem", fontSize: "0.82rem" }}>{currentCard.notes}</div>}
          </div>
        </div>

        {/* Camera preview */}
        {showCamera && (
          <div className="card-section" style={{ marginBottom: "1rem" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: "100%", maxHeight: 340, borderRadius: 8, background: "#000", objectFit: "contain" }}
            />
            {cameraError && <p style={{ color: "#dc3545", fontSize: "0.88rem", marginTop: "0.5rem" }}>{cameraError}</p>}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.75rem" }}>
              <button className="nav-btn" onClick={handleSnap}>📸 Snap</button>
              <button className="nav-btn secondary" onClick={stopCamera}>✕ Cancel</button>
            </div>
          </div>
        )}

        {/* Photo capture buttons */}
        {!showCamera && !editorFile && (
          <div className="card-section" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {/* Front */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Front</div>
                {currentCard.frontUrl ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={(window.location.hostname === "localhost" ? "http://localhost:8000" : "https://cardstoard.com") + currentCard.frontUrl}
                      alt="Front"
                      style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 6, border: "2px solid #28a745" }}
                    />
                    <span style={{ position: "absolute", top: 4, right: 4, background: "#28a745", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>✓</span>
                  </div>
                ) : (
                  <div style={{ width: 100, height: 140, border: "2px dashed var(--border, #ccc)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    📷
                  </div>
                )}
                {uploadingFront ? (
                  <div className="cs-spinner" style={{ width: 24, height: 24 }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", width: "100%" }}>
                    <button className="nav-btn" style={{ fontSize: "0.82rem", padding: "0.3rem 0.5rem" }} onClick={() => startCamera("front")}>
                      📷 Camera
                    </button>
                    <label style={{ cursor: "pointer" }}>
                      <span className="nav-btn secondary" style={{ display: "block", textAlign: "center", fontSize: "0.82rem", padding: "0.3rem 0.5rem" }}>
                        📂 File
                      </span>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFileInput(e, "front")} />
                    </label>
                  </div>
                )}
              </div>

              {/* Back */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Back</div>
                {currentCard.backUrl ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={(window.location.hostname === "localhost" ? "http://localhost:8000" : "https://cardstoard.com") + currentCard.backUrl}
                      alt="Back"
                      style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 6, border: "2px solid #28a745" }}
                    />
                    <span style={{ position: "absolute", top: 4, right: 4, background: "#28a745", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>✓</span>
                  </div>
                ) : (
                  <div style={{ width: 100, height: 140, border: "2px dashed var(--border, #ccc)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    📷
                  </div>
                )}
                {uploadingBack ? (
                  <div className="cs-spinner" style={{ width: 24, height: 24 }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", width: "100%" }}>
                    <button className="nav-btn" style={{ fontSize: "0.82rem", padding: "0.3rem 0.5rem" }} onClick={() => startCamera("back")}>
                      📷 Camera
                    </button>
                    <label style={{ cursor: "pointer" }}>
                      <span className="nav-btn secondary" style={{ display: "block", textAlign: "center", fontSize: "0.82rem", padding: "0.3rem 0.5rem" }}>
                        📂 File
                      </span>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFileInput(e, "back")} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <p style={{ color: "#dc3545", fontSize: "0.88rem", marginBottom: "0.75rem" }}>{uploadError}</p>
        )}

        {/* Action buttons */}
        {!showCamera && !editorFile && (
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="nav-btn"
              onClick={() => handleAdvance(false)}
              style={{ minWidth: 130 }}
            >
              {bothDone ? "✓ Next Card →" : "Next Card →"}
            </button>
            <button className="nav-btn secondary" onClick={() => handleAdvance(true)}>
              Skip
            </button>
            {(() => {
              const nextDupeIdx = queue.findIndex((item, i) => {
                if (i <= cursor) return false;
                const k = dupeKey(item);
                return dupeGroups[k] && dupeGroups[k].length >= 2;
              });
              return nextDupeIdx !== -1 ? (
                <button
                  className="nav-btn secondary"
                  title={`Jump to next duplicate (card ${nextDupeIdx + 1})`}
                  onClick={() => {
                    saveSession(queue, nextDupeIdx);
                    setCursor(nextDupeIdx);
                    setUploadError(null);
                  }}
                >
                  ⚠ Next Dupe →
                </button>
              ) : null;
            })()}
            <button className="nav-btn secondary" onClick={() => {
              saveSession(queue, cursor);
              navigate("/list-cards");
            }}>
              ⏸ Pause & Exit
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderResolution = () => {
    const dupeEntries = Object.entries(dupeGroups).filter(([, idxs]) =>
      idxs.filter(i => queue[i]?.frontUrl).length >= 2
    );

    return (
      <div>
        <h3 style={{ marginTop: 0 }}>Duplicate Resolution</h3>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Review photo assignments for duplicate cards. Swap front photos if needed.
          Assignment is provisional until physical labels are visible in photos.
        </p>

        {dupeEntries.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No actionable duplicate groups.</p>
        ) : (
          dupeEntries.map(([key, idxs]) => {
            const cardsInGroup = idxs.map(i => ({ ...queue[i], qIdx: i })).filter(c => c.frontUrl);
            return (
              <div key={key} className="card-section" style={{ marginBottom: "1rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                  ⚠ {cardsInGroup.length} copies — {cardTitle(queue[idxs[0]])}
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                  {cardsInGroup.map((c, pos) => (
                    <div key={c.id} style={{ textAlign: "center" }}>
                      <img
                        src={(window.location.hostname === "localhost" ? "http://localhost:8000" : "https://cardstoard.com") + c.frontUrl}
                        alt={`Card ${c.id}`}
                        style={{ width: 90, height: 126, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                      />
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>ID {c.id}</div>
                      {pos < cardsInGroup.length - 1 && (
                        <button
                          className="nav-btn secondary"
                          style={{ fontSize: "0.78rem", padding: "0.2rem 0.5rem", marginTop: "0.3rem" }}
                          disabled={swapLoading !== null}
                          onClick={() => handleSwapFront(c.qIdx, cardsInGroup[pos + 1].qIdx)}
                        >
                          {swapLoading === `${c.qIdx}-${cardsInGroup[pos + 1].qIdx}` ? "Swapping…" : "⇄ Swap"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {uploadError && <p style={{ color: "#dc3545", fontSize: "0.88rem" }}>{uploadError}</p>}

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button className="nav-btn" onClick={() => finishSession(queue)} style={{ minWidth: 180 }}>
            Confirm Assignments →
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const captured = queue.filter(i => i.done).length;
    const skipped  = queue.filter(i => i.skipped).length;
    const dupeCount = Object.keys(dupeGroups).length;

    return (
      <div className="card-section" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
        <h3 style={{ marginTop: 0 }}>Session Complete</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#28a745" }}>{captured}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>photographed</div>
          </div>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#ffc107" }}>{skipped}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>skipped</div>
          </div>
          {dupeCount > 0 && (
            <div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#ff8c00" }}>{dupeCount}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>duplicate groups</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="nav-btn" onClick={() => navigate("/list-cards")}>
            View My Cards
          </button>
          <button className="nav-btn secondary" onClick={() => {
            setPhase("setup");
            setQueue([]);
            setCursor(0);
            setDupeGroups({});
          }}>
            Start New Session
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  //  Main render
  // ═══════════════════════════════════════════════
  return (
    <>
      <AppHeader />
      <div className="container" style={{ maxWidth: 640, margin: "0 auto", padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ flex: 1 }}>
            <button
              className="nav-btn secondary"
              style={{ fontSize: "0.82rem", padding: "0.25rem 0.6rem" }}
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
          </div>
          <h2 className="page-header" style={{ margin: 0 }}>📸 Batch Capture</h2>
          <div style={{ flex: 1 }} />
        </div>

        {phase === "setup"      && renderSetup()}
        {phase === "queue"      && renderQueue()}
        {phase === "capture"    && renderCapture()}
        {phase === "resolution" && renderResolution()}
        {phase === "summary"    && renderSummary()}

        {/* ImageEditor modal */}
        {editorFile && (
          <ImageEditor
            file={editorFile}
            title={`Edit ${editorSide === "front" ? "Front" : "Back"} Photo — ${cardTitle(currentCard || {})}`}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        )}
      </div>
    </>
  );
}

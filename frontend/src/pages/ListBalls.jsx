// src/pages/ListBalls.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import LabelPreviewModal from "../components/LabelPreviewModal";

const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

const BALL_SORT_COLUMNS = [
  { key: "last_name",    label: "Last" },
  { key: "first_name",   label: "First" },
  { key: "brand",        label: "Brand" },
  { key: "commissioner", label: "Commissioner" },
  { key: "auth",         label: "Auth" },
  { key: "value",        label: "Value" },
];

function SortBallModal({ sortConfig, defaultSort, onApply, onClose }) {
  const [levels, setLevels] = useState([...sortConfig]);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const usedKeys = new Set(levels.map(l => l.key));
  const available = BALL_SORT_COLUMNS.filter(c => !usedKeys.has(c.key));

  const addLevel = () => {
    if (available.length === 0) return;
    setLevels(prev => [...prev, { key: available[0].key, direction: "asc" }]);
  };
  const removeLevel = (i) => setLevels(prev => prev.filter((_, idx) => idx !== i));
  const updateLevel = (i, field, value) =>
    setLevels(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const selStyle = { padding: "0.4rem", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 640, maxWidth: "95vw" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Advanced Sort</h3>

        {levels.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No sort levels. Add one below.</p>
        )}

        {levels.map((level, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", width: 20 }}>{i + 1}.</span>
            <select value={level.key} onChange={e => updateLevel(i, "key", e.target.value)} style={{ ...selStyle, flex: 1 }}>
              {BALL_SORT_COLUMNS.filter(c => c.key === level.key || !usedKeys.has(c.key)).map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <select value={level.direction} onChange={e => updateLevel(i, "direction", e.target.value)} style={{ ...selStyle, width: 130 }}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button onClick={() => removeLevel(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem" }}
              title="Remove">✕</button>
          </div>
        ))}

        <button onClick={addLevel} disabled={available.length === 0}
          style={{ marginTop: "0.5rem", background: "none", border: "1px dashed var(--border)",
            borderRadius: 6, padding: "0.35rem 0.75rem", cursor: available.length === 0 ? "not-allowed" : "pointer",
            color: "var(--text-muted)", fontSize: "0.85rem", width: "100%" }}>
          + Add Level
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem",
          marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={setAsDefault} onChange={e => setSetAsDefault(e.target.checked)} />
          Set as my default sort order
        </label>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "center" }}>
          <button className="nav-btn" style={{ background: "#c62828" }}
            onClick={() => { onApply([]); onClose(); }}>Clear All</button>
          <button className="nav-btn secondary" disabled={!defaultSort?.length}
            onClick={() => setLevels([...defaultSort])}
            title={defaultSort?.length ? "Restore saved default sort" : "No default sort saved"}>↺ Default</button>
          <button className="nav-btn secondary" onClick={onClose}>Cancel</button>
          <button className="nav-btn" onClick={async () => {
            if (setAsDefault) {
              try { await api.put("/settings/", { default_sort_balls: levels }); } catch (e) {}
            }
            onApply(levels);
            onClose();
          }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function ListBalls() {
  const navigate = useNavigate();

  const [balls, setBalls] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [lastNameFilter, setLastNameFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [authFilter, setAuthFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState([{ key: "last_name", direction: "asc" }]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(new Set());

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [labelData, setLabelData] = useState(null);

  const [focusId, setFocusId] = useState(null);
  const [jumpRate, setJumpRate] = useState(25);
  const [pinnedId, setPinnedId] = useState(null);

  const tableSectionRef = useRef(null);
  const rowRefsMap = useRef({});
  const defaultSortApplied = useRef(false);

  useEffect(() => {
    Promise.all([api.get("/balls/"), api.get("/settings/")])
      .then(([ballsRes, settingsRes]) => {
        setBalls(ballsRes.data);
        setSettings(settingsRes.data);
        setPinnedId(settingsRes.data.pinned_ball_id || null);
      })
      .catch(err => console.error("Error loading balls:", err))
      .finally(() => setLoading(false));
  }, []);

  // Apply saved default sort on first settings load
  useEffect(() => {
    if (defaultSortApplied.current) return;
    if (!settings) return;
    defaultSortApplied.current = true;
    if (settings.default_sort_balls?.length > 0) {
      setSortConfig(settings.default_sort_balls);
    }
  }, [settings]);

  useEffect(() => {
    tableSectionRef.current?.focus({ preventScroll: true });
  }, [balls]);

  useEffect(() => {
    const handler = () => {
      if (editingId !== null) return;
      api.get("/balls/").then(res => setBalls(res.data)).catch(() => {});
    };
    window.addEventListener("collection-changed", handler);
    return () => window.removeEventListener("collection-changed", handler);
  }, [editingId]);

  useEffect(() => {
    if (!focusId) return;
    const el = rowRefsMap.current[focusId];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setFocusId(null);
    }
  }, [focusId, balls]);

  // --- Filtering + Sorting ---
  const filteredBalls = (() => {
    let result = balls.filter(b => {
      if (lastNameFilter && !b.last_name.toLowerCase().includes(lastNameFilter.toLowerCase())) return false;
      if (brandFilter && !(b.brand || "").toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (authFilter === "auth" && !b.auth) return false;
      if (authFilter === "unauth" && b.auth) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      for (const { key, direction } of sortConfig) {
        let aVal, bVal;
        if (key === "last_name")      { aVal = (a.last_name || "").toLowerCase();    bVal = (b.last_name || "").toLowerCase(); }
        else if (key === "first_name"){ aVal = (a.first_name || "").toLowerCase();   bVal = (b.first_name || "").toLowerCase(); }
        else if (key === "brand")     { aVal = (a.brand || "").toLowerCase();        bVal = (b.brand || "").toLowerCase(); }
        else if (key === "commissioner") { aVal = (a.commissioner || "").toLowerCase(); bVal = (b.commissioner || "").toLowerCase(); }
        else if (key === "auth")      { aVal = a.auth ? 1 : 0;                       bVal = b.auth ? 1 : 0; }
        else if (key === "value")     { aVal = Number(a.value) || 0;                 bVal = Number(b.value) || 0; }
        else continue;
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    // Pinned row floats to top
    if (pinnedId) {
      const pinnedIdx = result.findIndex(b => b.id === pinnedId);
      if (pinnedIdx > 0) {
        const [pinned] = result.splice(pinnedIdx, 1);
        result.unshift(pinned);
      }
    }

    return result;
  })();

  const requestSort = (key) => {
    const existing = sortConfig.find(s => s.key === key);
    const direction = (existing && sortConfig.length === 1 && existing.direction === "asc") ? "desc" : "asc";
    setSortConfig([{ key, direction }]);
  };

  const getSortIndicator = (key) => {
    if (sortConfig.length !== 1 || sortConfig[0].key !== key) return "";
    return sortConfig[0].direction === "asc" ? " ▲" : " ▼";
  };

  const toggleFilter = (col) => {
    setOpenFilterCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  // --- CD nav ---
  const getAnchorIndex = () => {
    const container = tableSectionRef.current;
    if (!container || filteredBalls.length === 0) return 0;
    const scrollTop = container.scrollTop;
    for (let i = 0; i < filteredBalls.length; i++) {
      const el = rowRefsMap.current[filteredBalls[i].id];
      if (el && el.offsetTop >= scrollTop) return i;
    }
    return filteredBalls.length - 1;
  };

  const scrollToTop    = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = 0; };
  const scrollToBottom = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = tableSectionRef.current.scrollHeight; };
  const jumpUp   = () => { if (filteredBalls.length === 0) return; const idx = Math.max(0, getAnchorIndex() - jumpRate); setFocusId(filteredBalls[idx].id); };
  const jumpDown = () => { if (filteredBalls.length === 0) return; const idx = Math.min(filteredBalls.length - 1, getAnchorIndex() + jumpRate); setFocusId(filteredBalls[idx].id); };

  // --- Pin ---
  const handlePinRow = async (id) => {
    const next = pinnedId === id ? null : id;
    setPinnedId(next);
    try { await api.put("/settings/", { pinned_ball_id: next }); } catch (e) {}
  };

  // --- CRUD ---
  const handleEditStart = (ball) => {
    setEditingId(ball.id);
    setEditForm({
      first_name:   ball.first_name,
      last_name:    ball.last_name,
      brand:        ball.brand || "",
      commissioner: ball.commissioner || "",
      auth:         ball.auth || false,
      inscription:  ball.inscription || "",
      value:        ball.value != null ? String(ball.value) : "",
      notes:        ball.notes || "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (ball) => {
    const payload = {
      first_name:   editForm.first_name,
      last_name:    editForm.last_name,
      brand:        editForm.brand || null,
      commissioner: editForm.commissioner || null,
      auth:         editForm.auth,
      inscription:  editForm.inscription || null,
      value:        editForm.value !== "" ? parseFloat(editForm.value) : null,
      notes:        editForm.notes || null,
    };
    try {
      const res = await api.patch(`/balls/${ball.id}`, payload);
      setBalls(prev => prev.map(b => b.id === ball.id ? res.data : b));
      setEditingId(null);
      setEditForm({});
      setFocusId(ball.id);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save.");
    }
  };

  const handleEditCancel = () => { setEditingId(null); setEditForm({}); };

  const handleDelete = async (ball) => {
    const label = `${ball.first_name} ${ball.last_name}`;
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      await api.delete(`/balls/${ball.id}`);
      setBalls(prev => prev.filter(b => b.id !== ball.id));
      if (pinnedId === ball.id) {
        setPinnedId(null);
        try { await api.put("/settings/", { pinned_ball_id: null }); } catch (e) {}
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete.");
    }
  };

  const handleDuplicate = async (ball) => {
    const payload = {
      first_name:   ball.first_name,
      last_name:    ball.last_name,
      brand:        ball.brand || null,
      commissioner: ball.commissioner || null,
      auth:         ball.auth || false,
      inscription:  ball.inscription || null,
      value:        ball.value ?? null,
      notes:        ball.notes || null,
    };
    try {
      const res = await api.post("/balls/", payload);
      setBalls(prev => {
        const idx = prev.findIndex(b => b.id === ball.id);
        const next = [...prev];
        next.splice(idx + 1, 0, res.data);
        return next;
      });
      handleEditStart(res.data);
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert("Failed to duplicate.");
    }
  };

  const handleAddNew = () => {
    const blank = {
      id: "new",
      first_name: "", last_name: "", brand: "", commissioner: "",
      auth: false, inscription: "", value: "", notes: "",
    };
    setEditingId("new");
    setEditForm({ ...blank });
    setBalls(prev => [blank, ...prev]);
  };

  const handleAddSave = async () => {
    const payload = {
      first_name:   editForm.first_name,
      last_name:    editForm.last_name,
      brand:        editForm.brand || null,
      commissioner: editForm.commissioner || null,
      auth:         editForm.auth || false,
      inscription:  editForm.inscription || null,
      value:        editForm.value !== "" ? parseFloat(editForm.value) : null,
      notes:        editForm.notes || null,
    };
    if (!payload.first_name || !payload.last_name) {
      alert("First and last name are required.");
      return;
    }
    try {
      const res = await api.post("/balls/", payload);
      setBalls(prev => [res.data, ...prev.filter(b => b.id !== "new")]);
      setEditingId(null);
      setEditForm({});
      setFocusId(res.data.id);
    } catch (err) {
      console.error("Add failed:", err);
      alert("Failed to add ball.");
    }
  };

  const handleAddCancel = () => {
    setBalls(prev => prev.filter(b => b.id !== "new"));
    setEditingId(null);
    setEditForm({});
  };

  const handleRefreshValue = async (ball) => {
    try {
      const res = await api.post(`/balls/${ball.id}/refresh-value`);
      setBalls(prev => prev.map(b => b.id === ball.id ? res.data : b));
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const handlePrintLabel = async (ball) => {
    try {
      const res = await api.get(`/balls/${ball.id}/public`);
      setLabelData(res.data);
    } catch (err) {
      console.error("Label fetch error:", err);
      alert("Failed to load label.");
    }
  };

  // --- Stats ---
  const totalValue = filteredBalls.reduce((sum, b) => sum + (Number(b.value) || 0), 0);
  const hasFilters = lastNameFilter || brandFilter || authFilter !== "all";

  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };

  const cdBtn = (disabled) => ({
    background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.25 : 1, color: "var(--text-secondary)",
  });

  return (
    <>
      <AppHeader />
      <div className="list-container">
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 0.25rem" }}>
          Auto Balls
        </h2>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-blue)" }}>{filteredBalls.filter(b => b.id !== "new").length} ball{filteredBalls.filter(b => b.id !== "new").length !== 1 ? "s" : ""}</span>
            {totalValue > 0 && (
              <><span>&middot;</span><span style={{ color: "#2e7d32" }}>Value: {fmtDollar(totalValue)}</span></>
            )}
            {hasFilters && (
              <><span>&middot;</span>
                <span onClick={() => { setLastNameFilter(""); setBrandFilter(""); setAuthFilter("all"); setOpenFilterCols(new Set()); }}
                  style={{ color: "#dc3545", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>✕ Clear</span>
              </>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <button className="nav-btn" onClick={() => setShowSortModal(true)}
              style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem", ...(sortConfig.length > 0 && { background: "#1a7a1a" }) }}
              title="Advanced sort">
              ⇅ Sort{sortConfig.length > 0 ? ` (${sortConfig.length})` : ""}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <div className="cs-spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: "1rem", fontSize: "0.95rem" }}>Loading…</p>
          </div>
        ) : (
          <div
            ref={tableSectionRef}
            tabIndex={-1}
            className="card-section"
            style={{ width: "100%", boxSizing: "border-box", overflow: "auto", maxHeight: "calc(100vh - 200px)", outline: "none" }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {/* Last */}
                  <th style={{ width: 120, textAlign: "center", padding: "4px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("last_name")}>Last{getSortIndicator("last_name")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("last_name")} title="Filter by last name">🔍</span>
                    </div>
                    {openFilterCols.has("last_name") && (
                      <input type="text" value={lastNameFilter} onChange={e => setLastNameFilter(e.target.value)}
                        placeholder="Last…" autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }} />
                    )}
                  </th>

                  {/* First */}
                  <th style={{ width: 100, textAlign: "center", padding: "4px 6px" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("first_name")}>First{getSortIndicator("first_name")}</span>
                  </th>

                  {/* Brand */}
                  <th style={{ width: 100, textAlign: "center", padding: "4px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("brand")}>Brand{getSortIndicator("brand")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("brand")} title="Filter by brand">🔍</span>
                    </div>
                    {openFilterCols.has("brand") && (
                      <input type="text" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
                        placeholder="Brand…" autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }} />
                    )}
                  </th>

                  {/* Commissioner */}
                  <th style={{ width: 110, textAlign: "center", padding: "4px 6px" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("commissioner")}>Commissioner{getSortIndicator("commissioner")}</span>
                  </th>

                  {/* Auth */}
                  <th style={{ width: 80, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("auth")}>Auth{getSortIndicator("auth")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("auth")} title="Filter by auth">🔍</span>
                    </div>
                    {openFilterCols.has("auth") && (
                      <select value={authFilter} onChange={e => setAuthFilter(e.target.value)} autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }}>
                        <option value="all">All</option>
                        <option value="auth">Authenticated</option>
                        <option value="unauth">Not Authenticated</option>
                      </select>
                    )}
                  </th>

                  {/* Inscription */}
                  <th style={{ width: 160, textAlign: "center", padding: "4px 6px" }}>Inscription</th>

                  {/* Value */}
                  <th style={{ width: 90, textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("value")}>Value{getSortIndicator("value")}</span>
                  </th>

                  {/* Notes */}
                  <th style={{ width: 160, textAlign: "center", padding: "4px 6px" }}>Notes</th>

                  {/* Actions — CD nav */}
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140, minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem", marginBottom: "0.25rem", whiteSpace: "nowrap" }}>
                      <button onClick={scrollToTop}    disabled={filteredBalls.length === 0} style={cdBtn(filteredBalls.length === 0)} title="Jump to top">|◄</button>
                      <button onClick={jumpUp}         disabled={filteredBalls.length === 0} style={cdBtn(filteredBalls.length === 0)} title={`Jump up ${jumpRate} rows`}>▲</button>
                      <select value={jumpRate} onChange={e => setJumpRate(Number(e.target.value))}
                        style={{ fontSize: "0.75rem", padding: "1px 2px", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", borderRadius: 4, cursor: "pointer", width: "auto" }}
                        title="Jump rate">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                      <button onClick={jumpDown}       disabled={filteredBalls.length === 0} style={cdBtn(filteredBalls.length === 0)} title={`Jump down ${jumpRate} rows`}>▼</button>
                      <button onClick={scrollToBottom} disabled={filteredBalls.length === 0} style={cdBtn(filteredBalls.length === 0)} title="Jump to bottom">►|</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button onClick={() => pinnedId && setFocusId(pinnedId)} disabled={!pinnedId}
                          style={{ background: "none", border: "none", padding: 0, fontSize: "1.1rem", width: "auto",
                                   cursor: pinnedId ? "pointer" : "default", opacity: pinnedId ? 1 : 0.5, color: "#ff0000" }}
                          title={pinnedId ? "Jump to pinned row" : "No row pinned"}>📌</button>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button onClick={handleAddNew} disabled={editingId !== null}
                          style={{ background: "none", border: "none", fontSize: "1.5rem", width: "auto", padding: 0, color: "#28a745", cursor: editingId !== null ? "not-allowed" : "pointer", opacity: editingId !== null ? 0.4 : 1 }}
                          title="Add a ball">＋</button>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {balls.length === 0 && editingId === null && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      No auto balls yet. Click ＋ to add one.
                    </td>
                  </tr>
                )}
                {filteredBalls.map(ball => {
                  const isNew = ball.id === "new";
                  const isEditing = editingId === ball.id;

                  const isPinned = ball.id === pinnedId;
                  const rowStyle = isEditing
                    ? { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2" }
                    : isPinned
                    ? { backgroundColor: "#6b7280", color: "#fff" }
                    : {};

                  // Value freshness left border
                  const freshnessColor = (() => {
                    if (!ball.value_updated_at) return ball.value != null ? "#dc2626" : null;
                    const days = (Date.now() - new Date(ball.value_updated_at)) / 86400000;
                    if (days < 30) return null;
                    if (days < 90) return "#f59e0b";
                    return "#dc2626";
                  })();
                  const freshnessBorder = freshnessColor ? { borderLeft: `4px solid ${freshnessColor}` } : {};

                  return (
                    <tr
                      key={ball.id}
                      ref={el => { if (el) rowRefsMap.current[ball.id] = el; else delete rowRefsMap.current[ball.id]; }}
                      style={rowStyle}
                    >
                      {/* Last */}
                      <td style={{ padding: "4px 6px", width: 120 }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.last_name} onChange={e => handleEditChange("last_name", e.target.value)} placeholder="Last name" autoFocus={isNew} />
                          : <strong>{ball.last_name}</strong>}
                      </td>

                      {/* First */}
                      <td style={{ padding: "4px 6px", width: 100 }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.first_name} onChange={e => handleEditChange("first_name", e.target.value)} placeholder="First name" />
                          : ball.first_name}
                      </td>

                      {/* Brand */}
                      <td style={{ padding: "4px 6px", width: 100, textAlign: "center" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.brand} onChange={e => handleEditChange("brand", e.target.value)} placeholder="Brand" />
                          : ball.brand
                            ? <span className="badge badge-brand" style={{ marginRight: 0 }}>{ball.brand}</span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Commissioner */}
                      <td style={{ padding: "4px 6px", width: 110, textAlign: "center" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.commissioner} onChange={e => handleEditChange("commissioner", e.target.value)} placeholder="Commissioner" />
                          : ball.commissioner || <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Auth */}
                      <td style={{ width: 80, textAlign: "center" }}>
                        {isEditing
                          ? <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer" }}>
                              <input type="checkbox" checked={editForm.auth} onChange={e => handleEditChange("auth", e.target.checked)} />
                              <span style={{ fontSize: "0.8rem" }}>COA</span>
                            </label>
                          : ball.auth
                            ? <span className="badge" style={{ background: "#16a34a", marginRight: 0, fontSize: "0.75rem" }}>AUTH</span>
                            : <span className="badge" style={{ background: "#9ca3af", marginRight: 0, fontSize: "0.75rem" }}>UNAUTH</span>}
                      </td>

                      {/* Inscription */}
                      <td style={{ padding: "4px 8px", width: 160, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.inscription} onChange={e => handleEditChange("inscription", e.target.value)} placeholder="HOF 1974, etc." />
                          : ball.inscription
                            ? <span title={ball.inscription}>{ball.inscription.length > 30 ? ball.inscription.slice(0, 30) + "…" : ball.inscription}</span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Value */}
                      <td style={{ textAlign: "center", width: 90, ...freshnessBorder }}>
                        {isEditing
                          ? <input style={inp} type="number" step="0.01" value={editForm.value} onChange={e => handleEditChange("value", e.target.value)} placeholder="$" />
                          : ball.value != null
                            ? <span>
                                <span style={{ fontWeight: 600, color: "#2e7d32" }}>{fmtDollar(ball.value)}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleRefreshValue(ball); }}
                                  title="Confirm value is current (resets freshness timer)"
                                  style={{ background: "none", border: "none", cursor: "pointer",
                                           fontSize: "0.9rem", padding: "0 3px", color: "#0891b2",
                                           verticalAlign: "middle", lineHeight: 1 }}>↻</button>
                              </span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Notes */}
                      <td style={{ padding: "4px 8px", width: 160, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.notes} onChange={e => handleEditChange("notes", e.target.value)} placeholder="Notes" />
                          : ball.notes || ""}
                      </td>

                      {/* Actions */}
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button onClick={() => isNew ? handleAddSave() : handleEditSave(ball)}
                              style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✓ Save</button>
                            <button onClick={() => isNew ? handleAddCancel() : handleEditCancel()}
                              style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✗ Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={() => handlePinRow(ball.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px 4px", width: "auto",
                                opacity: isPinned ? 1 : 0.5,
                                color: isPinned ? "#ff0000" : "inherit",
                                transform: isPinned ? "none" : "rotate(45deg)",
                                transition: "opacity 0.15s, color 0.15s" }}
                              title={isPinned ? "Unpin row" : "Pin row"}>📌</button>
                            <button onClick={() => handleEditStart(ball)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#1976d2", width: "auto" }}
                              title="Edit">✏️</button>
                            <button onClick={() => handleDuplicate(ball)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#28a745", width: "auto" }}
                              title="Duplicate">📋</button>
                            <button onClick={() => handlePrintLabel(ball)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Print label">🖨️</button>
                            <button onClick={() => window.open(`/ball-view/${ball.id}`, "_blank")}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="View public page">ℹ️</button>
                            <button onClick={() => handleDelete(ball)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#dc3545", width: "auto" }}
                              title="Delete">✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSortModal && (
        <SortBallModal
          sortConfig={sortConfig}
          defaultSort={settings?.default_sort_balls || []}
          onApply={(levels) => setSortConfig(levels.length > 0 ? levels : [{ key: "last_name", direction: "asc" }])}
          onClose={() => setShowSortModal(false)}
        />
      )}
      {labelData && (
        <LabelPreviewModal
          labelData={labelData}
          onPrint={() => { window.open(`/ball-label/${labelData.id}`, "_blank"); setLabelData(null); }}
          onClose={() => setLabelData(null)}
        />
      )}
    </>
  );
}

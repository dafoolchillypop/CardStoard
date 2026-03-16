// src/pages/SetDetail.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";

const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

const VALID_GRADES = ["3", "1.5", "1", "0.8", "0.4", "0.2"];

const BOOK_FIELDS = [
  ["book_high",     "H",  "High (NM-MT+)"],
  ["book_high_mid", "HM", "High Mid (NM)"],
  ["book_mid",      "M",  "Mid (EX)"],
  ["book_low_mid",  "LM", "Low Mid (VG)"],
  ["book_low",      "L",  "Low (PR)"],
];

export default function SetDetail() {
  const { setId } = useParams();
  const navigate = useNavigate();

  const [setInfo, setSetInfo] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  const [lastNameFilter, setLastNameFilter] = useState("");
  const [rookieFilter, setRookieFilter] = useState("all"); // "all" | "rookie" | "non"
  const [buildFilter, setBuildFilter] = useState("all"); // "all" | "in" | "out"
  const [cardNumFilter, setCardNumFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "card_number", direction: "asc" });
  const [openFilterCols, setOpenFilterCols] = useState(new Set());

  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [focusEntryId, setFocusEntryId] = useState(null);
  const [jumpRate, setJumpRate] = useState(50);
  const [pinnedEntryId, setPinnedEntryId] = useState(() => {
    const stored = localStorage.getItem(`cs-pinned-set-entry-${setId}`);
    return stored ? Number(stored) : null;
  });

  const tableSectionRef = useRef(null);
  const rowRefsMap = useRef({});

  // Load set entries + settings
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [setsRes, entriesRes, settingsRes] = await Promise.all([
          api.get("/sets/"),
          api.get(`/sets/${setId}/entries`),
          api.get("/settings/"),
        ]);
        const found = setsRes.data.find(s => s.id === Number(setId));
        setSetInfo(found || null);
        setEntries(entriesRes.data);
        setSettings(settingsRes.data);
      } catch (err) {
        console.error("Error loading set detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [setId]);

  // Focus scroll container after render
  useEffect(() => {
    tableSectionRef.current?.focus({ preventScroll: true });
  }, [entries]);

  // Scroll to focused entry
  useEffect(() => {
    if (!focusEntryId) return;
    const el = rowRefsMap.current[focusEntryId];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setFocusEntryId(null);
    }
  }, [focusEntryId, entries]);

  // --- Filtering + Sorting ---
  const filteredEntries = (() => {
    let result = entries.filter(e => {
      if (cardNumFilter && !(e.card_number || "").toLowerCase().includes(cardNumFilter.toLowerCase())) return false;
      if (lastNameFilter && !(e.last_name || "").toLowerCase().includes(lastNameFilter.toLowerCase())) return false;
      if (rookieFilter === "rookie" && !e.rookie) return false;
      if (rookieFilter === "non" && e.rookie) return false;
      if (buildFilter === "in" && !e.in_build) return false;
      if (buildFilter === "out" && e.in_build) return false;
      return true;
    });

    const { key, direction } = sortConfig;
    result = [...result].sort((a, b) => {
      let aVal, bVal;
      if (key === "card_number") {
        const toNum = s => { const n = parseInt((s || "").replace(/\D/g, ""), 10); return isNaN(n) ? 9999 : n; };
        aVal = toNum(a.card_number); bVal = toNum(b.card_number);
      } else if (key === "last_name") {
        aVal = (a.last_name || "").toLowerCase(); bVal = (b.last_name || "").toLowerCase();
      } else if (key === "rookie") {
        aVal = a.rookie ? 1 : 0; bVal = b.rookie ? 1 : 0;
      } else if (key === "grade") {
        aVal = a.in_build ? (parseFloat(a.grade) || 0) : -1;
        bVal = b.in_build ? (parseFloat(b.grade) || 0) : -1;
      } else if (key === "value") {
        aVal = a.in_build ? (Number(a.value) || 0) : -1;
        bVal = b.in_build ? (Number(b.value) || 0) : -1;
      } else {
        return 0;
      }
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  })();

  // --- Row color ---
  const getRowStyle = (entry) => {
    if (!entry.in_build) return {};
    const g = parseFloat(entry.grade);
    const isRookie = entry.rookie;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const def = isDark
      ? { rg3: "#1d6090", g3: "#5f3d96", r: "#b8ad00" }
      : { rg3: "#b8d8f7", g3: "#e8dcff", r: "#fff3c4" };

    let style;
    if (isRookie && g === 3)
      style = { backgroundColor: isDark ? def.rg3 : (settings?.row_color_rookie_grade3 || def.rg3) };
    else if (g === 3)
      style = { backgroundColor: isDark ? def.g3 : (settings?.row_color_grade3 || def.g3) };
    else if (isRookie)
      style = { backgroundColor: isDark ? def.r : (settings?.row_color_rookie || def.r) };
    else
      // In build but no special grade/rookie highlight — use the same green as DictionaryList
      style = { backgroundColor: isDark ? "#052e16" : "#f0fdf4" };

    // Freshness indicator (left border)
    const freshnessColor = (() => {
      if (!entry.book_values_updated_at) return "#dc2626";
      const d = (Date.now() - new Date(entry.book_values_updated_at)) / (1000 * 60 * 60 * 24);
      if (d < 30) return null;
      if (d < 90) return "#f59e0b";
      return "#dc2626";
    })();
    if (freshnessColor) style = { ...style, borderLeft: `4px solid ${freshnessColor}` };

    return style;
  };

  // --- Actions ---
  const handleAddToBuild = async (entry) => {
    try {
      const res = await api.post(`/sets/${setId}/user-cards`, { set_entry_id: entry.id });
      setEntries(prev => prev.map(e => e.id === entry.id ? res.data : e));
      setEditingEntryId(res.data.id);
      setEditForm({ grade: "3", book_high: "", book_high_mid: "", book_mid: "", book_low_mid: "", book_low: "", notes: "" });
    } catch (err) {
      console.error("Add to build failed:", err);
      alert(err.response?.data?.detail || "Failed to add to build.");
    }
  };

  const handleEditStart = (entry) => {
    setEditingEntryId(entry.id);
    setEditForm({
      grade: entry.grade != null ? String(entry.grade) : "3",
      book_high:     entry.book_high     != null ? String(entry.book_high)     : "",
      book_high_mid: entry.book_high_mid != null ? String(entry.book_high_mid) : "",
      book_mid:      entry.book_mid      != null ? String(entry.book_mid)      : "",
      book_low_mid:  entry.book_low_mid  != null ? String(entry.book_low_mid)  : "",
      book_low:      entry.book_low      != null ? String(entry.book_low)      : "",
      notes:         entry.notes || "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (entry) => {
    const payload = {};
    if (editForm.grade !== undefined && editForm.grade !== "") payload.grade = parseFloat(editForm.grade);
    for (const [field] of BOOK_FIELDS) {
      if (editForm[field] !== undefined && editForm[field] !== "") payload[field] = parseFloat(editForm[field]);
      else payload[field] = null;
    }
    if (editForm.notes !== undefined) payload.notes = editForm.notes || null;

    try {
      const res = await api.patch(`/sets/${setId}/user-cards/${entry.id}`, payload);
      setEntries(prev => prev.map(e => e.id === entry.id ? res.data : e));
      setEditingEntryId(null);
      setEditForm({});
      setFocusEntryId(entry.id);
      // Update set info completion count
      setSetInfo(prev => prev ? {
        ...prev,
        in_collection_count: entries.filter(e => e.in_build).length,
      } : prev);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save.");
    }
  };

  const handleEditCancel = () => {
    setEditingEntryId(null);
    setEditForm({});
  };

  const handleRemove = async (entry) => {
    if (!window.confirm(`Remove ${entry.first_name || ""} ${entry.last_name || ""} #${entry.card_number} from your build?`)) return;
    try {
      await api.delete(`/sets/${setId}/user-cards/${entry.id}`);
      setEntries(prev => prev.map(e => e.id === entry.id
        ? { ...e, in_build: false, user_set_card_id: null, grade: null, book_high: null, book_high_mid: null, book_mid: null, book_low_mid: null, book_low: null, value: null, notes: null, book_values_updated_at: null }
        : e
      ));
    } catch (err) {
      console.error("Remove failed:", err);
      alert("Failed to remove.");
    }
  };

  // --- CD nav ---
  const getAnchorIndex = () => {
    const container = tableSectionRef.current;
    if (!container || filteredEntries.length === 0) return 0;
    const scrollTop = container.scrollTop;
    for (let i = 0; i < filteredEntries.length; i++) {
      const el = rowRefsMap.current[filteredEntries[i].id];
      if (el && el.offsetTop >= scrollTop) return i;
    }
    return filteredEntries.length - 1;
  };

  const handlePinRow = (entryId) => {
    setPinnedEntryId(prev => {
      const next = prev === entryId ? null : entryId;
      const key = `cs-pinned-set-entry-${setId}`;
      if (next) localStorage.setItem(key, String(next));
      else localStorage.removeItem(key);
      return next;
    });
  };

  const requestSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const toggleFilter = (col) => {
    setOpenFilterCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const scrollToTop = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = 0; };
  const scrollToBottom = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = tableSectionRef.current.scrollHeight; };
  const jumpUp = () => {
    if (filteredEntries.length === 0) return;
    const idx = Math.max(0, getAnchorIndex() - jumpRate);
    setFocusEntryId(filteredEntries[idx].id);
  };
  const jumpDown = () => {
    if (filteredEntries.length === 0) return;
    const idx = Math.min(filteredEntries.length - 1, getAnchorIndex() + jumpRate);
    setFocusEntryId(filteredEntries[idx].id);
  };

  // --- Derived stats ---
  const inBuildEntries = entries.filter(e => e.in_build);
  const totalValue = inBuildEntries.reduce((sum, e) => sum + Math.round(Number(e.value) || 0), 0);

  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };

  return (
    <>
      <AppHeader />
      <div className="list-container">
        {/* Header */}
        <div style={{ textAlign: "center", margin: "0.5rem 0 0.25rem" }}>
          <h2 className="page-header" style={{ margin: 0 }}>
            {setInfo ? setInfo.name : "Set"}
          </h2>
          {setInfo && (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              <span className="badge badge-brand" style={{ marginRight: "0.4rem" }}>{setInfo.brand}</span>
              {setInfo.year}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* Left: back link */}
          <div style={{ flex: 1 }}>
            <button className="nav-btn secondary" style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
              onClick={() => navigate("/sets")}>
              ← Sets
            </button>
          </div>

          {/* Center: stats */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-blue)" }}>
              {inBuildEntries.length} / {entries.length} in build
            </span>
            {totalValue > 0 && (
              <>
                <span>&middot;</span>
                <span style={{ color: "#2e7d32" }}>Value: {fmtDollar(totalValue)}</span>
              </>
            )}
            {(cardNumFilter || lastNameFilter || rookieFilter !== "all" || buildFilter !== "all") && (
              <>
                <span>&middot;</span>
                <span style={{ color: "#dc3545" }}>{filteredEntries.length} shown</span>
                <span
                  onClick={() => { setLastNameFilter(""); setRookieFilter("all"); setBuildFilter("all"); setCardNumFilter(""); }}
                  style={{ color: "#dc3545", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
                >✕ Clear</span>
              </>
            )}
          </div>

          {/* Right: filters */}
          <div style={{ flex: 1, display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Filter last name..."
              value={lastNameFilter}
              onChange={e => setLastNameFilter(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", width: 140 }}
            />
            <select value={rookieFilter} onChange={e => setRookieFilter(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.25rem 0.4rem", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" }}>
              <option value="all">All cards</option>
              <option value="rookie">Rookies only</option>
              <option value="non">Non-rookies</option>
            </select>
            <select value={buildFilter} onChange={e => setBuildFilter(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.25rem 0.4rem", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" }}>
              <option value="all">All</option>
              <option value="in">In build</option>
              <option value="out">Not in build</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <div className="cs-spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: "1rem", fontSize: "0.95rem" }}>Loading set…</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <p style={{ color: "var(--text-muted)" }}>No entries in this set.</p>
          </div>
        ) : (
          <div
            ref={tableSectionRef}
            tabIndex={-1}
            className="card-section set-section"
            style={{ width: "100%", boxSizing: "border-box", overflow: "auto", maxHeight: "calc(100vh - 200px)", outline: "none" }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="set-cardnum-col" style={{ width: 55, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("card_number")}>#{ getSortIndicator("card_number") }</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("card_number")} title="Filter by #">🔍</span>
                    </div>
                    {openFilterCols.has("card_number") && (
                      <input type="text" value={cardNumFilter} onChange={e => setCardNumFilter(e.target.value)}
                        placeholder="#..." autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }} />
                    )}
                  </th>
                  <th style={{ textAlign: "left", padding: "4px 8px", width: 80 }}>First</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", width: 100 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("last_name")}>Last{ getSortIndicator("last_name") }</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("last_name")} title="Filter by last name">🔍</span>
                    </div>
                    {openFilterCols.has("last_name") && (
                      <input type="text" value={lastNameFilter} onChange={e => setLastNameFilter(e.target.value)}
                        placeholder="Filter..." autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }} />
                    )}
                  </th>
                  <th className="set-rookie-col" style={{ width: 36, textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("rookie")} title="Sort by rookie">RC{ getSortIndicator("rookie") }</span>
                  </th>
                  <th style={{ textAlign: "center", width: 65 }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("grade")} title="Sort by grade">Grade{ getSortIndicator("grade") }</span>
                  </th>
                  <th className="book-col" style={{ textAlign: "center", minWidth: 180 }}>Book</th>
                  <th className="card-value-col" style={{ textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("value")} title="Sort by value">Value{ getSortIndicator("value") }</span>
                  </th>
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140 }}>
                    {/* CD nav row 1 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem", marginBottom: "0.25rem" }}>
                      <button onClick={scrollToTop} disabled={filteredEntries.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: filteredEntries.length === 0 ? "default" : "pointer",
                                 opacity: filteredEntries.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title="Jump to top">|◄</button>
                      <button onClick={jumpUp} disabled={filteredEntries.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: filteredEntries.length === 0 ? "default" : "pointer",
                                 opacity: filteredEntries.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title={`Jump up ${jumpRate} rows`}>▲</button>
                      <select value={jumpRate} onChange={e => setJumpRate(Number(e.target.value))}
                        style={{ fontSize: "0.75rem", padding: "1px 2px", border: "1px solid var(--border)",
                                 background: "var(--bg-input)", color: "var(--text-primary)",
                                 borderRadius: 4, cursor: "pointer", width: "auto" }}
                        title="Page size">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                      <button onClick={jumpDown} disabled={filteredEntries.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: filteredEntries.length === 0 ? "default" : "pointer",
                                 opacity: filteredEntries.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title={`Jump down ${jumpRate} rows`}>▼</button>
                      <button onClick={scrollToBottom} disabled={filteredEntries.length === 0}
                        style={{ background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
                                 cursor: filteredEntries.length === 0 ? "default" : "pointer",
                                 opacity: filteredEntries.length === 0 ? 0.25 : 1, color: "var(--text-secondary)" }}
                        title="Jump to bottom">►|</button>
                    </div>
                    {/* CD nav row 2: pin + add */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button onClick={() => pinnedEntryId && setFocusEntryId(pinnedEntryId)} disabled={!pinnedEntryId}
                          style={{ background: "none", border: "none", padding: 0, fontSize: "1.1rem", width: "auto",
                                   cursor: pinnedEntryId ? "pointer" : "default",
                                   opacity: pinnedEntryId ? 1 : 0.5, color: "#ff0000" }}
                          title={pinnedEntryId ? "Jump to pinned row" : "No row pinned"}>📌</button>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button disabled
                          style={{ background: "none", border: "none", fontSize: "1.5rem", width: "auto", padding: 0,
                                   color: "#28a745", cursor: "not-allowed" }}
                          title="Set entries are managed via import">＋</button>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => {
                  const isEditing = editingEntryId === entry.id;
                  const rowStyle = isEditing
                    ? { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2" }
                    : getRowStyle(entry);

                  const g = parseFloat(entry.grade);
                  let gradeClass = "grade-unknown";
                  if (!Number.isNaN(g)) {
                    if (g === 3)   gradeClass = "grade-mt";
                    else if (g === 1.5) gradeClass = "grade-ex";
                    else if (g === 1)   gradeClass = "grade-vg";
                    else if (g === 0.8) gradeClass = "grade-gd";
                    else if (g === 0.4) gradeClass = "grade-fr";
                    else                gradeClass = "grade-pr";
                  }

                  return (
                    <tr
                      key={entry.id}
                      ref={el => { if (el) rowRefsMap.current[entry.id] = el; else delete rowRefsMap.current[entry.id]; }}
                      style={rowStyle}
                    >
                      {/* Card # */}
                      <td className="set-cardnum-col" style={{ textAlign: "center", padding: "4px 6px" }}>
                        {entry.card_number}
                      </td>

                      {/* First */}
                      <td style={{ padding: "4px 8px", width: 80 }}>{entry.first_name || ""}</td>

                      {/* Last */}
                      <td style={{ padding: "4px 8px", width: 100 }}>{entry.last_name || ""}</td>

                      {/* RC */}
                      <td className="set-rookie-col" style={{ textAlign: "center" }}>
                        {entry.rookie && <span className="rookie-badge">⭐</span>}
                      </td>

                      {/* Grade */}
                      <td style={{ textAlign: "center", width: 65 }}>
                        {isEditing
                          ? <select style={inp} value={editForm.grade || "3"} onChange={e => handleEditChange("grade", e.target.value)}>
                              {VALID_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          : entry.in_build && entry.grade != null
                            ? <span className={`badge badge-grade ${gradeClass}`}>{entry.grade}</span>
                            : null}
                      </td>

                      {/* Book */}
                      <td className="book-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              {BOOK_FIELDS.map(([field, label, title]) => (
                                <div key={field} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                  <span style={{ fontSize: "0.7rem", color: "#888", width: "18px", flexShrink: 0 }}>{label}</span>
                                  <input style={inp} type="number" title={title} value={editForm[field] || ""} onChange={e => handleEditChange(field, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          : entry.in_build
                            ? <>
                                {entry.book_high     && <span className="book-badge book-high"    title="High (NM-MT+)">{entry.book_high}</span>}
                                {entry.book_high_mid && <span className="book-badge book-highmid" title="High Mid (NM)">{entry.book_high_mid}</span>}
                                {entry.book_mid      && <span className="book-badge book-mid"     title="Mid (EX)">{entry.book_mid}</span>}
                                {entry.book_low_mid  && <span className="book-badge book-lowmid"  title="Low Mid (VG)">{entry.book_low_mid}</span>}
                                {entry.book_low      && <span className="book-badge book-low"     title="Low (PR)">{entry.book_low}</span>}
                              </>
                            : null}
                      </td>

                      {/* Value */}
                      <td className="value-col" style={{ textAlign: "center" }}>
                        {entry.in_build && entry.value != null
                          ? (() => {
                              const v = Math.round(Number(entry.value) || 0);
                              const bH  = Number(entry.book_high)     || null;
                              const bHM = Number(entry.book_high_mid) || null;
                              const bM  = Number(entry.book_mid)      || null;
                              const bLM = Number(entry.book_low_mid)  || null;
                              let valueClass = "book-low";
                              if (bH  && v > bH)   valueClass = "value-above-book";
                              else if (bH  && v >= bH)  valueClass = "book-high";
                              else if (bHM && v >= bHM) valueClass = "book-highmid";
                              else if (bM  && v >= bM)  valueClass = "book-mid";
                              else if (bLM && v >= bLM) valueClass = "book-lowmid";
                              return <span className={`badge badge-value ${valueClass}`}>{fmtDollar(v)}</span>;
                            })()
                          : null}
                      </td>

                      {/* Actions */}
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEditSave(entry)}
                              style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}
                            >✓ Save</button>
                            <button
                              onClick={handleEditCancel}
                              style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}
                            >✗ Cancel</button>
                          </div>
                        ) : entry.in_build ? (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handlePinRow(entry.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px 4px", width: "auto",
                                opacity: Number(entry.id) === Number(pinnedEntryId) ? 1 : 0.5,
                                color: Number(entry.id) === Number(pinnedEntryId) ? "#ff0000" : "inherit",
                                transform: Number(entry.id) === Number(pinnedEntryId) ? "none" : "rotate(45deg)",
                                transition: "opacity 0.15s, color 0.15s" }}
                              title={Number(entry.id) === Number(pinnedEntryId) ? "Unpin row" : "Pin row"}>📌</button>
                            <button
                              onClick={() => handleEditStart(entry)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#1976d2", width: "auto" }}
                              title="Edit">✏️</button>
                            <button
                              onClick={() => handleRemove(entry)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#dc3545", width: "auto" }}
                              title="Remove from build">✕</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                            <button
                              onClick={() => handlePinRow(entry.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px 4px", width: "auto",
                                opacity: Number(entry.id) === Number(pinnedEntryId) ? 1 : 0.5,
                                color: Number(entry.id) === Number(pinnedEntryId) ? "#ff0000" : "inherit",
                                transform: Number(entry.id) === Number(pinnedEntryId) ? "none" : "rotate(45deg)",
                                transition: "opacity 0.15s, color 0.15s" }}
                              title={Number(entry.id) === Number(pinnedEntryId) ? "Unpin row" : "Pin row"}>📌</button>
                            <button
                              onClick={() => handleAddToBuild(entry)}
                              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem", padding: "3px 8px", color: "#28a745", width: "auto" }}
                              title="Add to build">＋ Add</button>
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
    </>
  );
}

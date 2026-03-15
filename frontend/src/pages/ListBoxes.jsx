// src/pages/ListBoxes.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import LabelPreviewModal from "../components/LabelPreviewModal";

const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

const TYPE_COLORS = { factory: "#1976d2", collated: "#d97706", binder: "#16a34a" };
const TYPE_LABELS = { factory: "Factory", collated: "Collated", binder: "Binder" };

function TypeBadge({ type }) {
  return (
    <span className="badge" style={{ backgroundColor: TYPE_COLORS[type] || TYPE_COLORS.factory, marginRight: 0 }}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

const BOX_SORT_COLUMNS = [
  { key: "year",     label: "Year" },
  { key: "brand",    label: "Brand" },
  { key: "name",     label: "Name" },
  { key: "set_type", label: "Type" },
  { key: "quantity", label: "Qty" },
  { key: "value",    label: "Value" },
  { key: "total",    label: "Total" },
];

function SortBoxModal({ sortConfig, defaultSort, onApply, onClose }) {
  const [levels, setLevels] = useState([...sortConfig]);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const usedKeys = new Set(levels.map(l => l.key));
  const available = BOX_SORT_COLUMNS.filter(c => !usedKeys.has(c.key));

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
              {BOX_SORT_COLUMNS.filter(c => c.key === level.key || !usedKeys.has(c.key)).map(c => (
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
              try { await api.put("/settings/", { default_sort_boxes: levels }); } catch (e) {}
            }
            onApply(levels);
            onClose();
          }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function ListBoxes() {
  const navigate = useNavigate();

  const [boxes, setBoxes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [brandFilter, setBrandFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState([{ key: "year", direction: "desc" }]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(new Set());

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [labelData, setLabelData] = useState(null);

  const [focusId, setFocusId] = useState(null);
  const [jumpRate, setJumpRate] = useState(25);
  const [pinnedId, setPinnedId] = useState(
    () => Number(localStorage.getItem("cs-pinned-box")) || null
  );

  const tableSectionRef = useRef(null);
  const rowRefsMap = useRef({});
  const defaultSortApplied = useRef(false);

  useEffect(() => {
    Promise.all([api.get("/boxes/"), api.get("/settings/")])
      .then(([boxesRes, settingsRes]) => {
        setBoxes(boxesRes.data);
        setSettings(settingsRes.data);
      })
      .catch(err => console.error("Error loading boxes:", err))
      .finally(() => setLoading(false));
  }, []);

  // Apply saved default sort on first settings load
  useEffect(() => {
    if (defaultSortApplied.current) return;
    if (!settings) return;
    defaultSortApplied.current = true;
    if (settings.default_sort_boxes?.length > 0) {
      setSortConfig(settings.default_sort_boxes);
    }
  }, [settings]);

  useEffect(() => {
    tableSectionRef.current?.focus({ preventScroll: true });
  }, [boxes]);

  useEffect(() => {
    if (!focusId) return;
    const el = rowRefsMap.current[focusId];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setFocusId(null);
    }
  }, [focusId, boxes]);

  // --- Filtering + Sorting ---
  const filteredBoxes = (() => {
    let result = boxes.filter(b => {
      if (brandFilter && !b.brand.toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (yearFilter && !String(b.year).includes(yearFilter)) return false;
      if (typeFilter !== "all" && b.set_type !== typeFilter) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      for (const { key, direction } of sortConfig) {
        let aVal, bVal;
        if (key === "year")          { aVal = a.year;                          bVal = b.year; }
        else if (key === "brand")    { aVal = (a.brand || "").toLowerCase();   bVal = (b.brand || "").toLowerCase(); }
        else if (key === "name")     { aVal = (a.name || "").toLowerCase();    bVal = (b.name || "").toLowerCase(); }
        else if (key === "set_type") { aVal = a.set_type;                                           bVal = b.set_type; }
        else if (key === "quantity") { aVal = Number(a.quantity) || 1;                              bVal = Number(b.quantity) || 1; }
        else if (key === "value")    { aVal = Number(a.value) || 0;                                 bVal = Number(b.value) || 0; }
        else if (key === "total")    { aVal = (Number(a.quantity) || 1) * (Number(a.value) || 0);  bVal = (Number(b.quantity) || 1) * (Number(b.value) || 0); }
        else continue;
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

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
    if (!container || filteredBoxes.length === 0) return 0;
    const scrollTop = container.scrollTop;
    for (let i = 0; i < filteredBoxes.length; i++) {
      const el = rowRefsMap.current[filteredBoxes[i].id];
      if (el && el.offsetTop >= scrollTop) return i;
    }
    return filteredBoxes.length - 1;
  };

  const scrollToTop    = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = 0; };
  const scrollToBottom = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = tableSectionRef.current.scrollHeight; };
  const jumpUp   = () => { if (filteredBoxes.length === 0) return; const idx = Math.max(0, getAnchorIndex() - jumpRate); setFocusId(filteredBoxes[idx].id); };
  const jumpDown = () => { if (filteredBoxes.length === 0) return; const idx = Math.min(filteredBoxes.length - 1, getAnchorIndex() + jumpRate); setFocusId(filteredBoxes[idx].id); };

  // --- Pin ---
  const handlePinRow = (id) => {
    setPinnedId(prev => {
      const next = prev === id ? null : id;
      if (next) localStorage.setItem("cs-pinned-box", String(next));
      else localStorage.removeItem("cs-pinned-box");
      return next;
    });
  };

  // --- CRUD ---
  const handleEditStart = (box) => {
    setEditingId(box.id);
    setEditForm({
      brand:    box.brand,
      year:     String(box.year),
      name:     box.name || "",
      set_type: box.set_type,
      quantity: String(box.quantity ?? 1),
      value:    box.value != null ? String(box.value) : "",
      notes:    box.notes || "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (box) => {
    const payload = {
      brand:    editForm.brand,
      year:     Number(editForm.year),
      name:     editForm.name || null,
      set_type: editForm.set_type,
      quantity: Number(editForm.quantity) || 1,
      value:    editForm.value !== "" ? parseFloat(editForm.value) : null,
      notes:    editForm.notes || null,
    };
    try {
      const res = await api.patch(`/boxes/${box.id}`, payload);
      setBoxes(prev => prev.map(b => b.id === box.id ? res.data : b));
      setEditingId(null);
      setEditForm({});
      setFocusId(box.id);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save.");
    }
  };

  const handleEditCancel = () => { setEditingId(null); setEditForm({}); };

  const handleDelete = async (box) => {
    const label = [box.brand, box.year, box.name].filter(Boolean).join(" ");
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      await api.delete(`/boxes/${box.id}`);
      setBoxes(prev => prev.filter(b => b.id !== box.id));
      if (pinnedId === box.id) { setPinnedId(null); localStorage.removeItem("cs-pinned-box"); }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete.");
    }
  };

  const handleDuplicate = async (box) => {
    const payload = {
      brand:    box.brand,
      year:     box.year,
      name:     box.name || null,
      set_type: box.set_type,
      quantity: box.quantity ?? 1,
      value:    box.value ?? null,
      notes:    box.notes || null,
    };
    try {
      const res = await api.post("/boxes/", payload);
      setBoxes(prev => {
        const idx = prev.findIndex(b => b.id === box.id);
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

  const handlePrintLabel = async (box) => {
    try {
      const res = await api.get(`/boxes/${box.id}/public`);
      setLabelData(res.data);
    } catch (err) {
      console.error("Label fetch error:", err);
      alert("Failed to load label.");
    }
  };

  // --- Stats ---
  const totalValue = filteredBoxes.reduce((sum, b) => sum + (Number(b.quantity) || 1) * (Number(b.value) || 0), 0);
  const hasFilters = brandFilter || yearFilter || typeFilter !== "all";

  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };
  const cardMakes = settings?.card_makes || [];

  const cdBtn = (disabled) => ({
    background: "none", border: "none", padding: "2px 3px", fontSize: "0.85rem", width: "auto",
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.25 : 1, color: "var(--text-secondary)",
  });

  return (
    <>
      <AppHeader />
      <div className="list-container">
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 0.25rem" }}>
          Sets / Binders
        </h2>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-blue)" }}>{filteredBoxes.length} item{filteredBoxes.length !== 1 ? "s" : ""}</span>
            {totalValue > 0 && (
              <><span>&middot;</span><span style={{ color: "#2e7d32" }}>Value: {fmtDollar(totalValue)}</span></>
            )}
            {hasFilters && (
              <><span>&middot;</span>
                <span onClick={() => { setBrandFilter(""); setYearFilter(""); setTypeFilter("all"); setOpenFilterCols(new Set()); }}
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
        ) : boxes.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>No sets or binders yet.</p>
            <button className="nav-btn" onClick={() => navigate("/add-box")}>＋ Add Your First Set/Binder</button>
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
                  {/* Year */}
                  <th style={{ width: 65, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("year")}>Year{getSortIndicator("year")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("year")} title="Filter by year">🔍</span>
                    </div>
                    {openFilterCols.has("year") && (
                      <input type="text" value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                        placeholder="Year…" autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }} />
                    )}
                  </th>

                  {/* Brand */}
                  <th style={{ width: 110, textAlign: "center", padding: "4px 8px" }}>
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

                  {/* Name */}
                  <th style={{ width: 180, textAlign: "center", padding: "4px 8px" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>Name{getSortIndicator("name")}</span>
                  </th>

                  {/* Type */}
                  <th style={{ width: 90, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("set_type")}>Type{getSortIndicator("set_type")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("set_type")} title="Filter by type">🔍</span>
                    </div>
                    {openFilterCols.has("set_type") && (
                      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }}>
                        <option value="all">All</option>
                        <option value="factory">Factory</option>
                        <option value="collated">Collated</option>
                        <option value="binder">Binder</option>
                      </select>
                    )}
                  </th>

                  {/* Qty */}
                  <th style={{ width: 55, textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("quantity")}>Qty{getSortIndicator("quantity")}</span>
                  </th>

                  {/* Value */}
                  <th style={{ width: 85, textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("value")}>Value{getSortIndicator("value")}</span>
                  </th>

                  {/* Total */}
                  <th style={{ width: 85, textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("total")}>Total{getSortIndicator("total")}</span>
                  </th>

                  {/* Notes */}
                  <th style={{ width: 160, textAlign: "center", padding: "4px 8px" }}>Notes</th>

                  {/* Actions — CD nav */}
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140, minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem", marginBottom: "0.25rem", whiteSpace: "nowrap" }}>
                      <button onClick={scrollToTop}    disabled={filteredBoxes.length === 0} style={cdBtn(filteredBoxes.length === 0)} title="Jump to top">|◄</button>
                      <button onClick={jumpUp}         disabled={filteredBoxes.length === 0} style={cdBtn(filteredBoxes.length === 0)} title={`Jump up ${jumpRate} rows`}>▲</button>
                      <select value={jumpRate} onChange={e => setJumpRate(Number(e.target.value))}
                        style={{ fontSize: "0.75rem", padding: "1px 2px", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", borderRadius: 4, cursor: "pointer", width: "auto" }}
                        title="Jump rate">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                      <button onClick={jumpDown}       disabled={filteredBoxes.length === 0} style={cdBtn(filteredBoxes.length === 0)} title={`Jump down ${jumpRate} rows`}>▼</button>
                      <button onClick={scrollToBottom} disabled={filteredBoxes.length === 0} style={cdBtn(filteredBoxes.length === 0)} title="Jump to bottom">►|</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button onClick={() => pinnedId && setFocusId(pinnedId)} disabled={!pinnedId}
                          style={{ background: "none", border: "none", padding: 0, fontSize: "1.1rem", width: "auto",
                                   cursor: pinnedId ? "pointer" : "default", opacity: pinnedId ? 1 : 0.5, color: "#ff0000" }}
                          title={pinnedId ? "Jump to pinned row" : "No row pinned"}>📌</button>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <button onClick={() => navigate("/add-box")}
                          style={{ background: "none", border: "none", fontSize: "1.5rem", width: "auto", padding: 0, color: "#28a745", cursor: "pointer" }}
                          title="Add a box or binder">＋</button>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBoxes.map(box => {
                  const isEditing = editingId === box.id;
                  const rowStyle = isEditing
                    ? { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2" }
                    : {};

                  return (
                    <tr
                      key={box.id}
                      ref={el => { if (el) rowRefsMap.current[box.id] = el; else delete rowRefsMap.current[box.id]; }}
                      style={rowStyle}
                    >
                      {/* Year */}
                      <td style={{ textAlign: "center", padding: "4px 6px", width: 65 }}>
                        {isEditing
                          ? <input style={inp} type="number" value={editForm.year} onChange={e => handleEditChange("year", e.target.value)} />
                          : box.year}
                      </td>

                      {/* Brand */}
                      <td style={{ padding: "4px 8px", width: 110, textAlign: "center" }}>
                        {isEditing
                          ? <select style={inp} value={editForm.brand} onChange={e => handleEditChange("brand", e.target.value)}>
                              {cardMakes.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          : <span className="badge badge-brand" style={{ marginRight: 0 }}>{box.brand}</span>}
                      </td>

                      {/* Name */}
                      <td style={{ padding: "4px 8px", width: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.name} onChange={e => handleEditChange("name", e.target.value)} placeholder="Optional name" />
                          : box.name || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}
                      </td>

                      {/* Type */}
                      <td style={{ textAlign: "center", width: 90 }}>
                        {isEditing
                          ? <select style={inp} value={editForm.set_type} onChange={e => handleEditChange("set_type", e.target.value)}>
                              <option value="factory">Factory</option>
                              <option value="collated">Collated</option>
                              <option value="binder">Binder</option>
                            </select>
                          : <TypeBadge type={box.set_type} />}
                      </td>

                      {/* Qty */}
                      <td style={{ textAlign: "center", width: 55 }}>
                        {isEditing
                          ? <input style={{ ...inp, width: 45 }} type="number" min="1" value={editForm.quantity} onChange={e => handleEditChange("quantity", e.target.value)} />
                          : <span>{box.quantity ?? 1}</span>}
                      </td>

                      {/* Value */}
                      <td style={{ textAlign: "center", width: 85 }}>
                        {isEditing
                          ? <input style={inp} type="number" step="0.01" value={editForm.value} onChange={e => handleEditChange("value", e.target.value)} placeholder="$" />
                          : box.value != null
                            ? <span style={{ fontWeight: 600, color: "#2e7d32" }}>{fmtDollar(box.value)}</span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Total */}
                      <td style={{ textAlign: "center", width: 85 }}>
                        {(() => {
                          const qty = isEditing ? (Number(editForm.quantity) || 1) : (box.quantity ?? 1);
                          const val = isEditing ? (parseFloat(editForm.value) || 0) : (box.value || 0);
                          const total = qty * val;
                          return total > 0
                            ? <span style={{ fontWeight: 600, color: "#1565c0" }}>{fmtDollar(total)}</span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>;
                        })()}
                      </td>

                      {/* Notes */}
                      <td style={{ padding: "4px 8px", width: 160, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.notes} onChange={e => handleEditChange("notes", e.target.value)} placeholder="Notes" />
                          : box.notes || ""}
                      </td>

                      {/* Actions */}
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button onClick={() => handleEditSave(box)}
                              style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✓ Save</button>
                            <button onClick={handleEditCancel}
                              style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✗ Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={() => handlePinRow(box.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px 4px", width: "auto",
                                opacity: box.id === pinnedId ? 1 : 0.5,
                                color: box.id === pinnedId ? "#ff0000" : "inherit",
                                transform: box.id === pinnedId ? "none" : "rotate(45deg)",
                                transition: "opacity 0.15s, color 0.15s" }}
                              title={box.id === pinnedId ? "Unpin row" : "Pin row"}>📌</button>
                            <button onClick={() => handleEditStart(box)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#1976d2", width: "auto" }}
                              title="Edit">✏️</button>
                            <button onClick={() => handleDuplicate(box)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#28a745", width: "auto" }}
                              title="Duplicate">📋</button>
                            <button onClick={() => handlePrintLabel(box)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Print">🖨️</button>
                            <button onClick={() => navigate(`/set-detail/${box.id}`)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Details">ℹ️</button>
                            <button onClick={() => handleDelete(box)}
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
      <SortBoxModal
        sortConfig={sortConfig}
        defaultSort={settings?.default_sort_boxes || []}
        onApply={(levels) => setSortConfig(levels.length > 0 ? levels : [{ key: "year", direction: "desc" }])}
        onClose={() => setShowSortModal(false)}
      />
    )}
    {labelData && (
      <LabelPreviewModal
        labelData={labelData}
        onPrint={() => { window.open(`/set-label/${labelData.id}`, "_blank"); setLabelData(null); }}
        onClose={() => setLabelData(null)}
      />
    )}
    </>
  );
}

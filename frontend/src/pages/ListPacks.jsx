// src/pages/ListPacks.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import LabelPreviewModal from "../components/LabelPreviewModal";

const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

const PACK_TYPES = ["cello", "rack", "wax", "blister"];

const PACK_TYPE_COLORS = {
  cello:   { bg: "#1d4ed8", text: "#fff" },
  rack:    { bg: "#d97706", text: "#fff" },
  wax:     { bg: "#16a34a", text: "#fff" },
  blister: { bg: "#7c3aed", text: "#fff" },
};

function PackTypeBadge({ type }) {
  if (!type) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const colors = PACK_TYPE_COLORS[type.toLowerCase()] || { bg: "#6b7280", text: "#fff" };
  return (
    <span style={{
      display: "inline-block",
      background: colors.bg,
      color: colors.text,
      borderRadius: 4,
      padding: "2px 7px",
      fontSize: "0.75rem",
      fontWeight: 600,
      textTransform: "capitalize",
    }}>
      {type}
    </span>
  );
}

const PACK_SORT_COLUMNS = [
  { key: "year",      label: "Year" },
  { key: "brand",     label: "Brand" },
  { key: "pack_type", label: "Type" },
  { key: "quantity",  label: "Qty" },
  { key: "value",     label: "Value" },
];

function SortPacksModal({ sortConfig, defaultSort, onApply, onClose }) {
  const [levels, setLevels] = useState([...sortConfig]);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const usedKeys = new Set(levels.map(l => l.key));
  const available = PACK_SORT_COLUMNS.filter(c => !usedKeys.has(c.key));

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
              {PACK_SORT_COLUMNS.filter(c => c.key === level.key || !usedKeys.has(c.key)).map(c => (
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
              try { await api.put("/settings/", { default_sort_packs: levels }); } catch (e) {}
            }
            onApply(levels);
            onClose();
          }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function ListPacks() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState([{ key: "year", direction: "desc" }]);
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
    Promise.all([api.get("/packs/"), api.get("/settings/")])
      .then(([itemsRes, settingsRes]) => {
        setItems(itemsRes.data);
        setSettings(settingsRes.data);
        setPinnedId(settingsRes.data.pinned_pack_id || null);
      })
      .catch(err => console.error("Error loading packs:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (defaultSortApplied.current) return;
    if (!settings) return;
    defaultSortApplied.current = true;
    if (settings.default_sort_packs?.length > 0) {
      setSortConfig(settings.default_sort_packs);
    }
  }, [settings]);

  useEffect(() => {
    tableSectionRef.current?.focus({ preventScroll: true });
  }, [items]);

  useEffect(() => {
    const handler = () => {
      if (editingId !== null) return;
      api.get("/packs/").then(res => setItems(res.data)).catch(() => {});
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
  }, [focusId, items]);

  // --- Filtering + Sorting ---
  const filtered = (() => {
    let result = items.filter(b => {
      if (yearFilter && !String(b.year).includes(yearFilter)) return false;
      if (brandFilter && !(b.brand || "").toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (typeFilter !== "all" && (b.pack_type || "").toLowerCase() !== typeFilter) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      for (const { key, direction } of sortConfig) {
        let aVal, bVal;
        if (key === "year")      { aVal = Number(a.year) || 0;               bVal = Number(b.year) || 0; }
        else if (key === "brand")     { aVal = (a.brand || "").toLowerCase();     bVal = (b.brand || "").toLowerCase(); }
        else if (key === "pack_type") { aVal = (a.pack_type || "").toLowerCase(); bVal = (b.pack_type || "").toLowerCase(); }
        else if (key === "quantity")  { aVal = Number(a.quantity) || 0;           bVal = Number(b.quantity) || 0; }
        else if (key === "value")     { aVal = Number(a.value) || 0;              bVal = Number(b.value) || 0; }
        else continue;
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

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
    if (!container || filtered.length === 0) return 0;
    const scrollTop = container.scrollTop;
    for (let i = 0; i < filtered.length; i++) {
      const el = rowRefsMap.current[filtered[i].id];
      if (el && el.offsetTop >= scrollTop) return i;
    }
    return filtered.length - 1;
  };

  const scrollToTop    = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = 0; };
  const scrollToBottom = () => { if (tableSectionRef.current) tableSectionRef.current.scrollTop = tableSectionRef.current.scrollHeight; };
  const jumpUp   = () => { if (filtered.length === 0) return; const idx = Math.max(0, getAnchorIndex() - jumpRate); setFocusId(filtered[idx].id); };
  const jumpDown = () => { if (filtered.length === 0) return; const idx = Math.min(filtered.length - 1, getAnchorIndex() + jumpRate); setFocusId(filtered[idx].id); };

  // --- Pin ---
  const handlePinRow = async (id) => {
    const next = pinnedId === id ? null : id;
    setPinnedId(next);
    try { await api.put("/settings/", { pinned_pack_id: next }); } catch (e) {}
  };

  // --- CRUD ---
  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditForm({
      year:      item.year != null ? String(item.year) : "",
      brand:     item.brand || "",
      pack_type: item.pack_type || "",
      quantity:  item.quantity != null ? String(item.quantity) : "1",
      value:     item.value != null ? String(item.value) : "",
      notes:     item.notes || "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (item) => {
    const payload = {
      year:      editForm.year !== "" ? parseInt(editForm.year, 10) : null,
      brand:     editForm.brand || null,
      pack_type: editForm.pack_type || null,
      quantity:  editForm.quantity !== "" ? parseInt(editForm.quantity, 10) : 1,
      value:     editForm.value !== "" ? parseFloat(editForm.value) : null,
      notes:     editForm.notes || null,
    };
    try {
      const res = await api.patch(`/packs/${item.id}`, payload);
      setItems(prev => prev.map(b => b.id === item.id ? res.data : b));
      setEditingId(null);
      setEditForm({});
      setFocusId(item.id);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save.");
    }
  };

  const handleEditCancel = () => { setEditingId(null); setEditForm({}); };

  const handleDelete = async (item) => {
    const label = `${item.year} ${item.brand}${item.pack_type ? " (" + item.pack_type + ")" : ""}`;
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      await api.delete(`/packs/${item.id}`);
      setItems(prev => prev.filter(b => b.id !== item.id));
      if (pinnedId === item.id) {
        setPinnedId(null);
        try { await api.put("/settings/", { pinned_pack_id: null }); } catch (e) {}
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete.");
    }
  };

  const handleDuplicate = async (item) => {
    const payload = {
      year:      item.year,
      brand:     item.brand,
      pack_type: item.pack_type || null,
      quantity:  item.quantity ?? 1,
      value:     item.value ?? null,
      notes:     item.notes || null,
    };
    try {
      const res = await api.post("/packs/", payload);
      setItems(prev => {
        const idx = prev.findIndex(b => b.id === item.id);
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
    const blank = { id: "new", year: "", brand: "", pack_type: "", quantity: "1", value: "", notes: "" };
    setEditingId("new");
    setEditForm({ ...blank });
    setItems(prev => [blank, ...prev]);
  };

  const handleAddSave = async () => {
    const payload = {
      year:      editForm.year !== "" ? parseInt(editForm.year, 10) : null,
      brand:     editForm.brand || null,
      pack_type: editForm.pack_type || null,
      quantity:  editForm.quantity !== "" ? parseInt(editForm.quantity, 10) : 1,
      value:     editForm.value !== "" ? parseFloat(editForm.value) : null,
      notes:     editForm.notes || null,
    };
    if (!payload.year || !payload.brand) {
      alert("Year and brand are required.");
      return;
    }
    try {
      const res = await api.post("/packs/", payload);
      setItems(prev => [res.data, ...prev.filter(b => b.id !== "new")]);
      setEditingId(null);
      setEditForm({});
      setFocusId(res.data.id);
    } catch (err) {
      console.error("Add failed:", err);
      alert("Failed to add pack.");
    }
  };

  const handleAddCancel = () => {
    setItems(prev => prev.filter(b => b.id !== "new"));
    setEditingId(null);
    setEditForm({});
  };

  const handleRefreshValue = async (item) => {
    try {
      const res = await api.post(`/packs/${item.id}/refresh-value`);
      setItems(prev => prev.map(b => b.id === item.id ? res.data : b));
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const handlePrintLabel = async (item) => {
    try {
      const res = await api.get(`/packs/${item.id}/public`);
      setLabelData(res.data);
    } catch (err) {
      console.error("Label fetch error:", err);
      alert("Failed to load label.");
    }
  };

  // --- Stats ---
  const realItems = filtered.filter(b => b.id !== "new");
  const totalQty = realItems.reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
  const totalValue = realItems.reduce((sum, b) => sum + (Number(b.quantity) || 1) * (Number(b.value) || 0), 0);
  const hasFilters = yearFilter || brandFilter || typeFilter !== "all";

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
          Packs
        </h2>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-blue)" }}>{totalQty} pack{totalQty !== 1 ? "s" : ""}</span>
            {totalValue > 0 && (
              <><span>&middot;</span><span style={{ color: "#2e7d32" }}>Total: {fmtDollar(totalValue)}</span></>
            )}
            {hasFilters && (
              <><span>&middot;</span>
                <span onClick={() => { setYearFilter(""); setBrandFilter(""); setTypeFilter("all"); setOpenFilterCols(new Set()); }}
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
                  {/* Year */}
                  <th style={{ width: 70, textAlign: "center", padding: "4px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("year")}>Year{getSortIndicator("year")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("year")} title="Filter by year">🔍</span>
                    </div>
                    {openFilterCols.has("year") && (
                      <input type="number" value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                        placeholder="Year…" autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }} />
                    )}
                  </th>

                  {/* Brand */}
                  <th style={{ width: 110, textAlign: "center", padding: "4px 6px" }}>
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

                  {/* Type */}
                  <th style={{ width: 90, textAlign: "center", padding: "4px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("pack_type")}>Type{getSortIndicator("pack_type")}</span>
                      <span style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.6 }} onClick={() => toggleFilter("pack_type")} title="Filter by type">🔍</span>
                    </div>
                    {openFilterCols.has("pack_type") && (
                      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} autoFocus
                        style={{ width: "100%", fontSize: "0.75rem", padding: "1px 2px", boxSizing: "border-box", marginTop: "2px" }}>
                        <option value="all">All</option>
                        {PACK_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    )}
                  </th>

                  {/* Qty */}
                  <th style={{ width: 55, textAlign: "center", padding: "4px 6px" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("quantity")}>Qty{getSortIndicator("quantity")}</span>
                  </th>

                  {/* Value */}
                  <th style={{ width: 90, textAlign: "center" }}>
                    <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("value")}>Value{getSortIndicator("value")}</span>
                  </th>

                  {/* Total */}
                  <th style={{ width: 85, textAlign: "center", padding: "4px 6px" }}>Total</th>

                  {/* Notes */}
                  <th style={{ width: 140, textAlign: "center", padding: "4px 6px" }}>Notes</th>

                  {/* Actions — CD nav */}
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140, minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem", marginBottom: "0.25rem", whiteSpace: "nowrap" }}>
                      <button onClick={scrollToTop}    disabled={filtered.length === 0} style={cdBtn(filtered.length === 0)} title="Jump to top">|◄</button>
                      <button onClick={jumpUp}         disabled={filtered.length === 0} style={cdBtn(filtered.length === 0)} title={`Jump up ${jumpRate} rows`}>▲</button>
                      <select value={jumpRate} onChange={e => setJumpRate(Number(e.target.value))}
                        style={{ fontSize: "0.75rem", padding: "1px 2px", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", borderRadius: 4, cursor: "pointer", width: "auto" }}
                        title="Jump rate">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                      <button onClick={jumpDown}       disabled={filtered.length === 0} style={cdBtn(filtered.length === 0)} title={`Jump down ${jumpRate} rows`}>▼</button>
                      <button onClick={scrollToBottom} disabled={filtered.length === 0} style={cdBtn(filtered.length === 0)} title="Jump to bottom">►|</button>
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
                          title="Add a pack">＋</button>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && editingId === null && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      No packs yet. Click ＋ to add one.
                    </td>
                  </tr>
                )}
                {filtered.map(item => {
                  const isNew = item.id === "new";
                  const isEditing = editingId === item.id;
                  const isPinned = item.id === pinnedId;

                  const rowStyle = isEditing
                    ? { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2" }
                    : isPinned
                    ? { backgroundColor: "#6b7280", color: "#fff" }
                    : {};

                  const freshnessColor = (() => {
                    if (!item.value_updated_at) return item.value != null ? "#dc2626" : null;
                    const days = (Date.now() - new Date(item.value_updated_at)) / 86400000;
                    if (days < 30) return null;
                    if (days < 90) return "#f59e0b";
                    return "#dc2626";
                  })();
                  const freshnessBorder = freshnessColor ? { borderLeft: `4px solid ${freshnessColor}` } : {};

                  const total = (Number(item.quantity) || 1) * (Number(item.value) || 0);

                  return (
                    <tr
                      key={item.id}
                      ref={el => { if (el) rowRefsMap.current[item.id] = el; else delete rowRefsMap.current[item.id]; }}
                      style={rowStyle}
                    >
                      {/* Year */}
                      <td style={{ padding: "4px 6px", width: 70, textAlign: "center" }}>
                        {isEditing
                          ? <input style={inp} type="number" value={editForm.year} onChange={e => handleEditChange("year", e.target.value)} placeholder="Year" autoFocus={isNew} />
                          : <strong>{item.year}</strong>}
                      </td>

                      {/* Brand */}
                      <td style={{ padding: "4px 6px", width: 110, textAlign: "center" }}>
                        {isEditing
                          ? <select style={inp} value={editForm.brand} onChange={e => handleEditChange("brand", e.target.value)}>
                              <option value="">— select —</option>
                              {cardMakes.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          : item.brand
                            ? <span className="badge badge-brand" style={{ marginRight: 0 }}>{item.brand}</span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Type */}
                      <td style={{ padding: "4px 6px", width: 90, textAlign: "center" }}>
                        {isEditing
                          ? <select style={inp} value={editForm.pack_type} onChange={e => handleEditChange("pack_type", e.target.value)}>
                              <option value="">— none —</option>
                              {PACK_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                          : <PackTypeBadge type={item.pack_type} />}
                      </td>

                      {/* Qty */}
                      <td style={{ padding: "4px 6px", width: 55, textAlign: "center" }}>
                        {isEditing
                          ? <input style={inp} type="number" min="1" value={editForm.quantity} onChange={e => handleEditChange("quantity", e.target.value)} placeholder="Qty" />
                          : item.quantity ?? 1}
                      </td>

                      {/* Value */}
                      <td style={{ textAlign: "center", width: 90, ...freshnessBorder }}>
                        {isEditing
                          ? <input style={inp} type="number" step="0.01" value={editForm.value} onChange={e => handleEditChange("value", e.target.value)} placeholder="$" />
                          : item.value != null
                            ? <span>
                                <span style={{ fontWeight: 600, color: "#2e7d32" }}>{fmtDollar(item.value)}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleRefreshValue(item); }}
                                  title="Confirm value is current (resets freshness timer)"
                                  style={{ background: "none", border: "none", cursor: "pointer",
                                           fontSize: "0.9rem", padding: "0 3px", color: "#0891b2",
                                           verticalAlign: "middle", lineHeight: 1 }}>↻</button>
                              </span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Total */}
                      <td style={{ padding: "4px 6px", width: 85, textAlign: "center" }}>
                        {item.value != null && !isNew
                          ? <span style={{ color: "#2e7d32" }}>{fmtDollar(total)}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>

                      {/* Notes */}
                      <td style={{ padding: "4px 8px", width: 140, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isEditing
                          ? <input style={inp} type="text" value={editForm.notes} onChange={e => handleEditChange("notes", e.target.value)} placeholder="Notes" />
                          : item.notes || ""}
                      </td>

                      {/* Actions */}
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button onClick={() => isNew ? handleAddSave() : handleEditSave(item)}
                              style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✓ Save</button>
                            <button onClick={() => isNew ? handleAddCancel() : handleEditCancel()}
                              style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✗ Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={() => handlePinRow(item.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px 4px", width: "auto",
                                opacity: isPinned ? 1 : 0.5,
                                color: isPinned ? "#ff0000" : "inherit",
                                transform: isPinned ? "none" : "rotate(45deg)",
                                transition: "opacity 0.15s, color 0.15s" }}
                              title={isPinned ? "Unpin row" : "Pin row"}>📌</button>
                            <button onClick={() => handleEditStart(item)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#1976d2", width: "auto" }}
                              title="Edit">✏️</button>
                            <button onClick={() => handleDuplicate(item)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#28a745", width: "auto" }}
                              title="Duplicate">📋</button>
                            <button onClick={() => handlePrintLabel(item)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Print label">🖨️</button>
                            <button onClick={() => window.open(`/pack-view/${item.id}`, "_blank")}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="View public page">ℹ️</button>
                            <button onClick={() => handleDelete(item)}
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
        <SortPacksModal
          sortConfig={sortConfig}
          defaultSort={settings?.default_sort_packs || []}
          onApply={(levels) => setSortConfig(levels.length > 0 ? levels : [{ key: "year", direction: "desc" }])}
          onClose={() => setShowSortModal(false)}
        />
      )}
      {labelData && (
        <LabelPreviewModal
          labelData={labelData}
          onPrint={() => { window.open(`/pack-label/${labelData.id}`, "_blank"); setLabelData(null); }}
          onClose={() => setLabelData(null)}
        />
      )}
    </>
  );
}

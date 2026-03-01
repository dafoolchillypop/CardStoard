import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import "./ListCards.css";

export default function DictionaryList() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [originalRookieYear, setOriginalRookieYear] = useState(null);
  const [toast, setToast] = useState("");
  const [openFilterCols, setOpenFilterCols] = useState(new Set());

  const fetchCount = async () => {
    try {
      const res = await api.get("/dictionary/count");
      setTotal(res.data.count);
    } catch (err) {
      console.error("Error fetching dictionary count:", err);
    }
  };

  const fetchEntries = async () => {
    try {
      const params = {
        skip: page * (limit === "all" ? total : limit),
        limit: limit === "all" ? total || 9999 : limit,
      };
      if (lastNameFilter) params.last_name = lastNameFilter;
      if (brandFilter) params.brand = brandFilter;
      if (yearFilter) params.year = parseInt(yearFilter, 10);
      const res = await api.get("/dictionary/entries", { params });
      setEntries(res.data);
    } catch (err) {
      console.error("Error fetching dictionary entries:", err);
    }
  };

  useEffect(() => { fetchCount(); }, []);
  useEffect(() => { fetchEntries(); }, [page, limit, lastNameFilter, brandFilter, yearFilter, total]);

  const handleLimitChange = (e) => {
    const value = e.target.value;
    setLimit(value === "all" ? "all" : parseInt(value, 10));
    setPage(0);
  };

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortArrow = (key) => sortConfig.key === key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : "";

  const sortedEntries = React.useMemo(() => {
    if (!sortConfig.key) return entries;
    return [...entries].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [entries, sortConfig]);

  const toggleFilterCol = (col) => {
    setOpenFilterCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  };

  const handleEditStart = (entry) => {
    setEditingEntryId(entry.id);
    setEditForm({ ...entry });
    setOriginalRookieYear(entry.rookie_year ?? null);
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditingEntryId(null);
    setEditForm({});
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleEditSave = async (id) => {
    try {
      if (id === "new") {
        const res = await api.post("/dictionary/entries", editForm);
        setEntries(prev => [res.data, ...prev]);
        setTotal(prev => prev + 1);
      } else {
        const res = await api.put(`/dictionary/entries/${id}`, editForm);
        setEntries(prev => prev.map(e => e.id === id ? res.data : e));

        // Propagate rookie_year change across all entries for this player
        const newRookieYear = editForm.rookie_year != null && editForm.rookie_year !== ""
          ? parseInt(editForm.rookie_year, 10) : null;
        if (newRookieYear !== originalRookieYear) {
          try {
            const params = {
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              ...(newRookieYear != null ? { rookie_year: newRookieYear } : {}),
            };
            const bulkRes = await api.patch("/dictionary/players/rookie-year", null, { params });
            showToast(`Rookie year updated for all ${bulkRes.data.updated} ${editForm.first_name} ${editForm.last_name} entries`);
            fetchEntries(); // refresh to reflect bulk update
          } catch (bulkErr) {
            console.error("Bulk rookie year update failed:", bulkErr);
          }
        }
      }
      setEditingEntryId(null);
      setEditForm({});
    } catch (err) {
      console.error("Error saving entry:", err);
      alert("Failed to save entry.");
    }
  };

  const handleDuplicate = async (entry) => {
    const { id, in_collection, ...fields } = entry;
    try {
      const res = await api.post("/dictionary/entries", fields);
      setEntries(prev => [res.data, ...prev]);
      setTotal(prev => prev + 1);
      setEditingEntryId(res.data.id);
      setEditForm({ ...res.data });
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert("Failed to duplicate entry.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this dictionary entry?")) return;
    try {
      await api.delete(`/dictionary/entries/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error("Error deleting entry:", err);
      alert("Failed to delete entry.");
    }
  };

  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };

  return (
    <>
      <AppHeader />
      {toast && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: "#1a7a1a", color: "#fff", padding: "0.6rem 1.4rem", borderRadius: "8px",
          zIndex: 9999, fontSize: "0.9rem", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
          {toast}
        </div>
      )}
      <div className="list-container">

        {/* Line 1: title */}
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 0.25rem" }}>
          Player Dictionary
        </h2>

        {/* Line 2: single toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem" }}>

          {/* Left: Import CSV */}
          <div style={{ minWidth: 120 }}>
            <button
              className="nav-btn"
              style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
              onClick={() => navigate("/dictionary/import")}
            >
              Import CSV
            </button>
          </div>

          {/* Center: paging + count + clear filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", color: "#555" }}>
            {limit !== "all" && (
              <span
                onClick={() => setPage(p => Math.max(p - 1, 0))}
                style={{ cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.3 : 1, fontSize: "1.1rem", userSelect: "none" }}
              >{"<"}</span>
            )}
            <select
              value={limit}
              onChange={handleLimitChange}
              style={{ fontSize: "0.9rem", border: "none", background: "transparent", cursor: "pointer", fontWeight: "bold", color: "#007bff" }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
            <span>of <b>{total}</b> entries</span>
            {limit !== "all" && (
              <span
                onClick={() => { if ((page + 1) * limit < total) setPage(p => p + 1); }}
                style={{ cursor: (page + 1) * limit >= total ? "not-allowed" : "pointer", opacity: (page + 1) * limit >= total ? 0.3 : 1, fontSize: "1.1rem", userSelect: "none" }}
              >{">"}</span>
            )}
            {(lastNameFilter || brandFilter || yearFilter) && (
              <>
                <span>&middot;</span>
                <span
                  onClick={() => { setLastNameFilter(""); setBrandFilter(""); setYearFilter(""); setPage(0); }}
                  style={{ color: "#dc3545", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
                >✕ Clear filters</span>
              </>
            )}
          </div>

          {/* Right: balance */}
          <div style={{ minWidth: 120 }} />
        </div>

        <div className="card-section" style={{ width: "100%", boxSizing: "border-box", overflow: "auto", maxHeight: "calc(100vh - 180px)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>First</th>

                  {/* Last — sortable + filterable */}
                  <th onClick={() => requestSort("last_name")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Last{sortArrow("last_name")}
                      <span
                        onClick={e => { e.stopPropagation(); toggleFilterCol("last"); }}
                        style={{ cursor: "pointer", fontSize: "0.75rem", color: lastNameFilter ? "#007bff" : "#aaa" }}
                        title="Filter by last name"
                      >🔍</span>
                    </div>
                    {openFilterCols.has("last") && (
                      <input autoFocus type="text" value={lastNameFilter}
                        onChange={e => { setLastNameFilter(e.target.value); setPage(0); }}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.key === "Escape" && toggleFilterCol("last")}
                        placeholder="Filter..."
                        style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>

                  <th style={{ textAlign: "center" }}>Rookie Year</th>

                  {/* Brand — sortable + filterable */}
                  <th onClick={() => requestSort("brand")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Brand{sortArrow("brand")}
                      <span
                        onClick={e => { e.stopPropagation(); toggleFilterCol("brand"); }}
                        style={{ cursor: "pointer", fontSize: "0.75rem", color: brandFilter ? "#007bff" : "#aaa" }}
                        title="Filter by brand"
                      >🔍</span>
                    </div>
                    {openFilterCols.has("brand") && (
                      <input autoFocus type="text" value={brandFilter}
                        onChange={e => { setBrandFilter(e.target.value); setPage(0); }}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.key === "Escape" && toggleFilterCol("brand")}
                        placeholder="Filter..."
                        style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>

                  {/* Year — sortable + filterable */}
                  <th onClick={() => requestSort("year")} style={{ cursor: "pointer", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Year{sortArrow("year")}
                      <span
                        onClick={e => { e.stopPropagation(); toggleFilterCol("year"); }}
                        style={{ cursor: "pointer", fontSize: "0.75rem", color: yearFilter ? "#007bff" : "#aaa" }}
                        title="Filter by year"
                      >🔍</span>
                    </div>
                    {openFilterCols.has("year") && (
                      <input autoFocus type="text" value={yearFilter}
                        onChange={e => { setYearFilter(e.target.value); setPage(0); }}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.key === "Escape" && toggleFilterCol("year")}
                        placeholder="Filter..."
                        style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>

                  <th style={{ textAlign: "center" }}>Card #</th>

                  {/* Actions header — ＋ to add */}
                  <th style={{ textAlign: "center", width: 100 }}>
                    <button
                      onClick={() => {
                        if (editingEntryId === "new") return;
                        setEditingEntryId("new");
                        setEditForm({ first_name: "", last_name: "", rookie_year: "", brand: "", year: "", card_number: "" });
                      }}
                      style={{ background: "none", border: "none", cursor: editingEntryId === "new" ? "not-allowed" : "pointer", fontSize: "1.5rem", color: editingEntryId === "new" ? "#aaa" : "#28a745", padding: 0 }}
                      title="Add"
                    >＋</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* New entry row */}
                {editingEntryId === "new" && (
                  <tr style={{ backgroundColor: "#f0fff4", outline: "2px solid #28a745" }}>
                    <td><input style={inp} placeholder="First" value={editForm.first_name || ""} onChange={e => handleEditChange("first_name", e.target.value)} /></td>
                    <td><input style={inp} placeholder="Last" value={editForm.last_name || ""} onChange={e => handleEditChange("last_name", e.target.value)} /></td>
                    <td><input style={inp} type="number" placeholder="Rookie Year" value={editForm.rookie_year || ""} onChange={e => handleEditChange("rookie_year", e.target.value)} /></td>
                    <td><input style={inp} placeholder="Brand" value={editForm.brand || ""} onChange={e => handleEditChange("brand", e.target.value)} /></td>
                    <td><input style={inp} type="number" placeholder="Year" value={editForm.year || ""} onChange={e => handleEditChange("year", e.target.value)} /></td>
                    <td><input style={inp} placeholder="Card #" value={editForm.card_number || ""} onChange={e => handleEditChange("card_number", e.target.value)} /></td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                        <button onClick={() => handleEditSave("new")} style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>✓ Save</button>
                        <button onClick={handleEditCancel} style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>✗ Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}

                {sortedEntries.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>No entries found.</td></tr>
                ) : sortedEntries.map(entry => {
                  const isEditing = editingEntryId === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: "1px solid #eee",
                        ...(isEditing
                          ? { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2" }
                          : entry.in_collection
                            ? { backgroundColor: "#f0fdf4" }
                            : {}),
                      }}
                    >
                      <td style={{ padding: "0.35rem 0.5rem" }}>
                        {isEditing
                          ? <input style={inp} value={editForm.first_name || ""} onChange={e => handleEditChange("first_name", e.target.value)} />
                          : entry.first_name}
                      </td>
                      <td style={{ padding: "0.35rem 0.5rem" }}>
                        {isEditing
                          ? <input style={inp} value={editForm.last_name || ""} onChange={e => handleEditChange("last_name", e.target.value)} />
                          : entry.last_name}
                      </td>
                      <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                        {isEditing
                          ? <input style={inp} type="number" value={editForm.rookie_year || ""} onChange={e => handleEditChange("rookie_year", e.target.value)} />
                          : entry.rookie_year}
                      </td>
                      <td style={{ padding: "0.35rem 0.5rem" }}>
                        {isEditing
                          ? <input style={inp} value={editForm.brand || ""} onChange={e => handleEditChange("brand", e.target.value)} />
                          : <span className="badge badge-brand">{entry.brand}</span>}
                      </td>
                      <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                        {isEditing
                          ? <input style={inp} type="number" value={editForm.year || ""} onChange={e => handleEditChange("year", e.target.value)} />
                          : entry.year}
                      </td>
                      <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                        {isEditing
                          ? <input style={inp} value={editForm.card_number || ""} onChange={e => handleEditChange("card_number", e.target.value)} />
                          : entry.card_number}
                      </td>
                      <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button onClick={() => handleEditSave(entry.id)} style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>✓ Save</button>
                            <button onClick={handleEditCancel} style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>✗ Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button onClick={() => handleEditStart(entry)} title="Edit"
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#1976d2" }}>✏️</button>
                            <button onClick={() => handleDuplicate(entry)} title="Copy"
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#28a745" }}>📋</button>
                            <button onClick={() => handleDelete(entry.id)} title="Delete"
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#dc3545" }}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </div>
    </>
  );
}

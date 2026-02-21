import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";

export default function DictionaryList() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [showFilter, setShowFilter] = useState(false);
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this dictionary entry?")) return;
    try {
      await api.delete(`/dictionary/entries/${id}`);
      fetchCount();
      fetchEntries();
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  const handleLimitChange = (e) => {
    const value = e.target.value;
    setLimit(value === "all" ? "all" : parseInt(value, 10));
    setPage(0);
  };

  const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

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

  const sortArrow = (key) => sortConfig.key === key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : "";

  const PagingBlock = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", margin: "0.25rem 0" }}>
      {limit !== "all" && (
        <span
          onClick={() => setPage(p => Math.max(p - 1, 0))}
          style={{ cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.3 : 1, fontSize: "1.2rem", userSelect: "none" }}
        >{"<"}</span>
      )}
      <label style={{ fontSize: "0.95rem" }}>
        Show{" "}
        <select value={limit} onChange={handleLimitChange} style={{ margin: "0 0.5rem" }}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">All</option>
        </select>{" "}
        per page
      </label>
      {limit !== "all" && (
        <span
          onClick={() => { if ((page + 1) * limit < total) setPage(p => p + 1); }}
          style={{ cursor: (page + 1) * limit >= total ? "not-allowed" : "pointer", opacity: (page + 1) * limit >= total ? 0.3 : 1, fontSize: "1.2rem", userSelect: "none" }}
        >{">"}</span>
      )}
    </div>
  );

  return (
    <>
      <AppHeader />
      <div className="list-container">
        {/* Header bar */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", width: "100%", padding: "0 1rem", boxSizing: "border-box", marginBottom: "0.5rem" }}>
          <h2 className="page-header" style={{ margin: "1rem 0", textAlign: "center", flexGrow: 1 }}>
            Player Dictionary
          </h2>
          <span style={{ position: "absolute", right: "1rem", fontSize: "0.95rem", color: "#555" }}>
            <b>{total}</b> total entries
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", justifyContent: "center" }}>
          <button className="nav-btn" onClick={() => navigate("/dictionary/add")}>+ Add Entry</button>
          <button className="nav-btn" onClick={() => navigate("/dictionary/import")}>Import CSV</button>
        </div>

        <div className="card-section" style={{ width: "100%", boxSizing: "border-box" }}>
          <PagingBlock />

          {/* Filter toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            {!showFilter ? (
              <button onClick={() => setShowFilter(true)} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", textDecoration: "underline", fontSize: "0.9rem" }}>
                Show Filters
              </button>
            ) : (
              <div style={{ display: "inline-flex", gap: "2rem", alignItems: "center" }}>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Last Name: </label>
                  <input type="text" value={lastNameFilter} onChange={e => { setLastNameFilter(e.target.value); setPage(0); }} placeholder="Enter last name" style={{ fontSize: "0.85rem", padding: "2px 6px", width: "140px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Brand: </label>
                  <input type="text" value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(0); }} placeholder="Enter brand" style={{ fontSize: "0.85rem", padding: "2px 6px", width: "120px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Year: </label>
                  <input type="text" value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(0); }} placeholder="Enter year" style={{ fontSize: "0.85rem", padding: "2px 6px", width: "80px" }} />
                </div>
                <button
                  onClick={() => { setShowFilter(false); setLastNameFilter(""); setBrandFilter(""); setYearFilter(""); setPage(0); }}
                  style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline" }}
                >
                  ✕ Hide Filters
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.5rem" }}>First</th>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("last_name")}>Last{sortArrow("last_name")}</th>
                  <th style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}>Rookie Year</th>
                  <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("brand")}>Brand{sortArrow("brand")}</th>
                  <th style={{ textAlign: "center", padding: "0.4rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("year")}>Year{sortArrow("year")}</th>
                  <th style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}>Card #</th>
                  <th style={{ textAlign: "center", padding: "0.4rem 0.5rem", width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "1rem" }}>No entries found.</td></tr>
                ) : sortedEntries.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.35rem 0.5rem" }}>{entry.first_name}</td>
                    <td style={{ padding: "0.35rem 0.5rem" }}>{entry.last_name}</td>
                    <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>{entry.rookie_year}</td>
                    <td style={{ padding: "0.35rem 0.5rem" }}>
                      <span className="badge badge-brand">{entry.brand}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>{entry.year}</td>
                    <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>{entry.card_number}</td>
                    <td style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                        <button className="small-btn" onClick={() => navigate(`/dictionary/edit/${entry.id}`)}>Edit</button>
                        <button className="small-btn" onClick={() => handleDelete(entry.id)} style={{ color: "#dc3545" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PagingBlock />
        </div>
      </div>
    </>
  );
}

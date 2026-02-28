// src/pages/ListCards.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import CardImages from "../components/CardImages";
import LabelPreviewModal from "../components/LabelPreviewModal";

const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

export default function ListCards() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnState = location.state || {};

  const [cards, setCards] = useState([]);
  const [page, setPage] = useState(returnState.page ?? 0);
  const [limit, setLimit] = useState(returnState.limit ?? 25);
  const [total, setTotal] = useState(0);
  const [settings, setSettings] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [lastNameFilter, setLastNameFilter] = useState(returnState.lastNameFilter ?? "");
  const [brandFilter, setBrandFilter] = useState(returnState.brandFilter ?? "");
  const [gradeFilter, setGradeFilter] = useState(returnState.gradeFilter ?? "");
  const [yearFilter, setYearFilter] = useState(returnState.yearFilter ?? "");
  const [sortConfig, setSortConfig] = React.useState(returnState.sortConfig ?? { key: null, direction: "asc" });
  const [returnCardId, setReturnCardId] = useState(returnState.returnCardId ?? null);
  const [pinnedCard, setPinnedCard] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [labelData, setLabelData] = useState(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(new Set());
  const [playerNames, setPlayerNames] = useState({ firstNames: [], lastNames: [] });
  const skipNextFetchRef = React.useRef(false);

  // Fetch the updated card directly so it's always visible regardless of current page
  useEffect(() => {
    if (!returnCardId) { setPinnedCard(null); return; }
    api.get(`/cards/${returnCardId}`)
      .then(res => setPinnedCard(res.data))
      .catch(() => setPinnedCard(null));
  }, [returnCardId]);

  const clearPin = () => { setReturnCardId(null); setPinnedCard(null); };

  const handlePrintLabel = (card) => {
    setLabelLoading(card.id);
    api.get(`/cards/${card.id}/public`)
      .then((res) => setLabelData(res.data))
      .catch((err) => console.error("Label fetch error:", err))
      .finally(() => setLabelLoading(false));
  };

  const toggleFilterCol = (col) => {
    setOpenFilterCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const handleEditStart = (card) => {
    setEditingCardId(card.id);
    setEditForm({ ...card });
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (cardId) => {
    if (cardId === "new") {
      try {
        const res = await api.post("/cards/", editForm);
        setCards(prev => [res.data, ...prev]);
        setTotal(prev => prev + 1);
        setEditingCardId(null);
        setEditForm({});
      } catch (err) {
        console.error("Error adding card:", err);
        alert("Failed to add card.");
      }
    } else {
      try {
        const res = await api.put(`/cards/${cardId}`, editForm);
        setCards(prev => prev.map(c => c.id === cardId ? res.data : c));
        if (pinnedCard?.id === cardId) setPinnedCard(res.data);
        setEditingCardId(null);
      } catch (err) {
        console.error("Error updating card:", err);
        alert("Failed to save changes.");
      }
    }
  };

  const handleEditCancel = () => {
    setEditingCardId(null);
    setEditForm({});
  };

  const handleNewNameKeyDown = (e, field, names) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    const typed = (editForm[field] || "").trim().toLowerCase();
    if (!typed) return;
    const match = names.find(n => n.toLowerCase().startsWith(typed));
    if (match && match.toLowerCase() !== typed) {
      if (e.key === "Enter") e.preventDefault();
      setEditForm(prev => ({ ...prev, [field]: match }));
    }
  };

  const handleDuplicate = async (card) => {
    const { id, value, market_factor, front_image, back_image, ...fields } = card;
    try {
      const res = await api.post("/cards/", fields);
      const newCard = res.data;
      skipNextFetchRef.current = true;
      setCards(prev => [newCard, ...prev]);
      setTotal(prev => prev + 1);
      setEditingCardId(newCard.id);
      setEditForm({ ...newCard });
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert("Failed to duplicate card.");
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`Delete ${card.first_name} ${card.last_name}?`)) return;
    try {
      await api.delete(`/cards/${card.id}`);
      setCards(prev => prev.filter(c => c.id !== card.id));
      setTotal(prev => prev - 1);
      if (pinnedCard?.id === card.id) setPinnedCard(null);
    } catch (err) {
      console.error("Error deleting card:", err);
      alert("Failed to delete card.");
    }
  };

  // Load count once
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get("/cards/count");
        setTotal(res.data.count);
      } catch (err) {
        console.error("Error fetching count:", err);
      }
    };
    fetchCount();
  }, []);

  // Load settings once
  useEffect(() => {
    api
      .get("/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // Load player names for smart fill autocomplete
  useEffect(() => {
    api.get("/cards/players")
      .then((res) => {
        const players = res.data.players || [];
        setPlayerNames({
          firstNames: [...new Set(players.map(p => p.first_name))].sort(),
          lastNames: [...new Set(players.map(p => p.last_name))].sort(),
        });
      })
      .catch(() => {});
  }, []);

  // Smart fill for inline new-card row
  useEffect(() => {
    if (editingCardId !== "new") return;
    if (!settings?.enable_smart_fill) return;
    if (!editForm.first_name || !editForm.last_name) return;

    const params = {
      first_name: editForm.first_name.trim().toLowerCase(),
      last_name: editForm.last_name.trim().toLowerCase(),
    };
    if (editForm.brand) params.brand = editForm.brand;
    if (editForm.year && !isNaN(Number(editForm.year))) params.year = Number(editForm.year);

    const timeout = setTimeout(async () => {
      try {
        const res = await api.get("/cards/smart-fill", { params });
        if (res.data.status === "ok") {
          setEditForm(prev => ({
            ...prev,
            rookie: res.data.fields.rookie !== undefined
              ? (res.data.fields.rookie ? 1 : 0)
              : prev.rookie,
            card_number: res.data.fields.card_number || prev.card_number,
          }));
        }
      } catch (err) {
        console.error("Smart Fill error:", err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [editForm.first_name, editForm.last_name, editForm.brand, editForm.year, editingCardId, settings?.enable_smart_fill]);

  // Load page of cards when page/limit changes
  useEffect(() => {
    if (skipNextFetchRef.current) { skipNextFetchRef.current = false; return; }
    const fetchCards = async () => {
      // When showing all records, wait until the count is loaded
      if (limit === "all" && total === 0) return;
      try {
        const skip = page * (limit === "all" ? total : limit);
        const url =
          limit === "all"
            ? `/cards/?skip=0&limit=${total}`
            : `/cards/?skip=${skip}&limit=${limit}`;
        const res = await api.get(url);
        setCards(res.data);
      } catch (err) {
        console.error("Error fetching cards:", err);
      }
    };
    fetchCards();
  }, [page, limit, location, total]);

  const handleLimitChange = (e) => {
    const value = e.target.value;
    clearPin();
    if (value === "all") {
      setLimit("all");
      setPage(0);
    } else {
      setLimit(parseInt(value, 10));
      setPage(0);
    }
  };

  const nextPage = () => {
    if ((page + 1) * limit < total) { clearPin(); setPage((prev) => prev + 1); }
  };

  const prevPage = () => {
    clearPin(); setPage((prev) => Math.max(prev - 1, 0));
  };

  const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);

  
  // Filtering Fields
  const filteredCards = cards.filter((card) => {
    const matchesLastName = lastNameFilter
      ? card.last_name?.toLowerCase().includes(lastNameFilter.toLowerCase())
      : true;

    const matchesBrand = brandFilter
      ? card.brand?.toLowerCase().includes(brandFilter.toLowerCase())
      : true;

    const matchesGrade = gradeFilter
      ? String(card.grade || "").toLowerCase().includes(gradeFilter.toLowerCase())
      : true;

    const matchesYear = yearFilter
      ? String(card.year || "").includes(yearFilter)
      : true;

    return matchesLastName && matchesBrand && matchesGrade && matchesYear;
  });

  const sortedCards = React.useMemo(() => {
    let sortable = [...filteredCards];

    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let aVal, bVal;

        // Map key to actual value
        switch (sortConfig.key) {
          case "year":
            aVal = parseInt(a.year, 10);
            bVal = parseInt(b.year, 10);
            break;
          case "last_name":
            aVal = a.last_name?.toLowerCase() || "";
            bVal = b.last_name?.toLowerCase() || "";
            break;
          case "grade":
            aVal = parseFloat(a.grade) || 0;
            bVal = parseFloat(b.grade) || 0;
            break;
          case "card_value":
            aVal = Number(a.value) || 0;
            bVal = Number(b.value) || 0;
            break;
          default:
            aVal = a[sortConfig.key];
            bVal = b[sortConfig.key];
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [filteredCards, sortConfig, settings]);

  // Prepend the freshly-fetched pinned card; remove it from the page results if it also appears there
  const displayedCards = React.useMemo(() => {
    if (!pinnedCard) return sortedCards;
    const rest = sortedCards.filter(c => Number(c.id) !== Number(pinnedCard.id));
    return [pinnedCard, ...rest];
  }, [sortedCards, pinnedCard]);

  const requestSort = (key) => {
    clearPin();
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Add this near top of component body (after sortedCards is defined)
  const totalValue = React.useMemo(
    () => displayedCards.reduce((sum, card) => sum + Math.round(Number(card.value) || 0), 0), [displayedCards]
  );

    return (
      <>
      <AppHeader />
      <div className="list-container">

        {/* Line 1: compact title */}
        <h2 className="page-header" style={{ textAlign: "center", margin: "0.5rem 0 0.25rem" }}>
          My Cards
        </h2>

        {/* Line 2: single toolbar — left / center / right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1rem", marginBottom: "0.5rem" }}>

          {/* Left: selection toggle */}
          <div style={{ minWidth: 120 }}>
            {!selectionMode ? (
              <button
                className="nav-btn"
                style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                onClick={() => setSelectionMode(true)}
              >
                Select to Print
              </button>
            ) : (
              <button
                className="nav-btn secondary"
                style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
              >
                ✕ Cancel
              </button>
            )}
          </div>

          {/* Center: inline paging + count + value */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", color: "#555" }}>
            {limit !== "all" && (
              <span
                onClick={prevPage}
                style={{ cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.3 : 1, fontSize: "1.1rem", userSelect: "none" }}
                aria-label="Previous page"
              >{"<"}</span>
            )}
            <select
              value={limit}
              onChange={handleLimitChange}
              style={{ fontSize: "0.9rem", border: "none", background: "transparent", cursor: "pointer", fontWeight: "bold", color: "#007bff" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
            <span>of <b>{total}</b> cards</span>
            <span>&middot;</span>
            <span style={{ color: "#2e7d32" }}>Value: {fmtDollar(totalValue)}</span>
            {limit !== "all" && (
              <span
                onClick={nextPage}
                style={{ cursor: (page + 1) * limit >= total ? "not-allowed" : "pointer", opacity: (page + 1) * limit >= total ? 0.3 : 1, fontSize: "1.1rem", userSelect: "none" }}
                aria-label="Next page"
              >{">"}</span>
            )}
            {(lastNameFilter || brandFilter || yearFilter || gradeFilter) && (
              <>
                <span>&middot;</span>
                <span
                  onClick={() => { setLastNameFilter(""); setBrandFilter(""); setYearFilter(""); setGradeFilter(""); }}
                  style={{ color: "#dc3545", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
                >✕ Clear filters</span>
              </>
            )}
          </div>

          {/* Right: print buttons */}
          <div style={{ display: "flex", gap: "0.5rem", minWidth: 120, justifyContent: "flex-end" }}>
            {selectionMode && selectedIds.size > 0 && (
              <button
                className="nav-btn"
                style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                onClick={() => navigate("/batch-labels", { state: { mode: "selection", ids: [...selectedIds] } })}
              >
                🖨️ Print Selected ({selectedIds.size})
              </button>
            )}
            <button
              className="nav-btn"
              style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
              onClick={() => navigate("/batch-labels", { state: { mode: "all" } })}
            >
              🖨️ Print All
            </button>
          </div>

        </div>

        <div style={{ clear: "both" }} />  {/* ensures layout resets after float */}
      
        {cards.length === 0 ? (
          <p style={{ textAlign: "center" }}>No cards found.</p>
        ) : (
          <div className="card-section" style={{ width: "100%", boxSizing: "border-box" }}>
          {/* Table */}
          <div className="table-scroll" style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {selectionMode && (
                    <th style={{ width: 32, textAlign: "center", padding: "0 4px" }}>
                      <input
                        type="checkbox"
                        title="Select all"
                        checked={displayedCards.length > 0 && displayedCards.every(c => selectedIds.has(c.id))}
                        onChange={(e) => {
                          const ids = displayedCards.map(c => c.id);
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) ids.forEach(id => next.add(id));
                            else ids.forEach(id => next.delete(id));
                            return next;
                          });
                        }}
                      />
                    </th>
                  )}
                  <th className="fname-col">First</th>
                  <th className="lname-col" onClick={() => requestSort("last_name")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Last {sortConfig.key === "last_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                      <span onClick={(e) => { e.stopPropagation(); toggleFilterCol("last"); }} style={{ cursor: "pointer", fontSize: "0.75rem", color: lastNameFilter ? "#007bff" : "#aaa" }} title="Filter by last name">🔍</span>
                    </div>
                    {openFilterCols.has("last") && (
                      <input autoFocus type="text" value={lastNameFilter} onChange={(e) => setLastNameFilter(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("last")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>
                  <th className="year-col" onClick={() => requestSort("year")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Year {sortConfig.key === "year" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                      <span onClick={(e) => { e.stopPropagation(); toggleFilterCol("year"); }} style={{ cursor: "pointer", fontSize: "0.75rem", color: yearFilter ? "#007bff" : "#aaa" }} title="Filter by year">🔍</span>
                    </div>
                    {openFilterCols.has("year") && (
                      <input autoFocus type="text" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("year")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>
                  <th className="brand-col">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Brand
                      <span onClick={() => toggleFilterCol("brand")} style={{ cursor: "pointer", fontSize: "0.75rem", color: brandFilter ? "#007bff" : "#aaa" }} title="Filter by brand">🔍</span>
                    </div>
                    {openFilterCols.has("brand") && (
                      <input autoFocus type="text" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("brand")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>
                  <th className="card-number-col">Card #</th>
                  <th className="rookie-col" style={{ textAlign: "center", width: 55 }}>Rookie</th>

                  <th className="grade-col" style={{ textAlign: "center", width: 65, cursor: "pointer" }} onClick={() => requestSort("grade")}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      Grade {sortConfig.key === "grade" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                      <span onClick={(e) => { e.stopPropagation(); toggleFilterCol("grade"); }} style={{ cursor: "pointer", fontSize: "0.75rem", color: gradeFilter ? "#007bff" : "#aaa" }} title="Filter by grade">🔍</span>
                    </div>
                    {openFilterCols.has("grade") && (
                      <input autoFocus type="text" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && toggleFilterCol("grade")} placeholder="Filter..." style={{ width: "90%", fontSize: "0.75rem", padding: "1px 4px", display: "block", margin: "3px auto 0" }} />
                    )}
                  </th>

                  <th className="book-col" style={{ textAlign: "center", minWidth: 180 }}>Book</th>
                  <th className="market-factor-col" style={{ textAlign: "center", width: 80 }}>Market Factor</th>

                  <th className="card-value-col" style={{ textAlign: "center", cursor: "pointer" }}
                      onClick={() => requestSort("card_value")}>Card Value {sortConfig.key === "card_value" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>

                  <th className="card-images-col" style={{ textAlign: "center", width: 65 }}>Images</th>
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 50 }}>
                    <button
                      onClick={() => {
                        if (editingCardId === "new") return;
                        setEditingCardId("new");
                        setEditForm({
                          first_name: "", last_name: "", year: "", card_number: "",
                          brand: settings?.card_makes?.[0] || "",
                          grade: settings?.card_grades?.[0] || "",
                          rookie: 0,
                          book_high: "", book_high_mid: "", book_mid: "", book_low_mid: "", book_low: ""
                        });
                      }}
                      style={{ background: "none", border: "none", cursor: editingCardId === "new" ? "not-allowed" : "pointer", fontSize: "1.5rem", color: editingCardId === "new" ? "#aaa" : "#28a745", width: "auto", padding: 0 }}
                      title="Add"
                    >＋</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {editingCardId === "new" && (() => {
                  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };
                  return (
                    <tr style={{ backgroundColor: "#f0fff4", outline: "2px solid #28a745" }}>
                      {selectionMode && <td style={{ width: 32 }} />}
                      <td className="fname-col"><input style={inp} placeholder="First" value={editForm.first_name || ""} onChange={e => handleEditChange("first_name", e.target.value)} onKeyDown={e => handleNewNameKeyDown(e, "first_name", playerNames.firstNames)} /></td>
                      <td className="lname-col"><input style={inp} placeholder="Last" value={editForm.last_name || ""} onChange={e => handleEditChange("last_name", e.target.value)} onKeyDown={e => handleNewNameKeyDown(e, "last_name", playerNames.lastNames)} /></td>
                      <td className="year-col"><input style={inp} type="number" placeholder="Year" value={editForm.year || ""} onChange={e => handleEditChange("year", e.target.value)} /></td>
                      <td className="brand-col">
                        <select style={inp} value={editForm.brand || ""} onChange={e => handleEditChange("brand", e.target.value)}>
                          {(settings?.card_makes || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="card-number-col"><input style={inp} placeholder="Card #" value={editForm.card_number || ""} onChange={e => handleEditChange("card_number", e.target.value)} /></td>
                      <td className="rookie-col" style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={!!Number(editForm.rookie)} onChange={e => handleEditChange("rookie", e.target.checked ? 1 : 0)} />
                      </td>
                      <td className="grade-col">
                        <select style={inp} value={editForm.grade || ""} onChange={e => handleEditChange("grade", parseFloat(e.target.value))}>
                          {(settings?.card_grades || []).map(gr => <option key={gr} value={gr}>{gr}</option>)}
                        </select>
                      </td>
                      <td className="book-col">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {[["book_high","H"],["book_high_mid","HM"],["book_mid","M"],["book_low_mid","LM"],["book_low","L"]].map(([field, label]) => (
                            <div key={field} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              <span style={{ fontSize: "0.7rem", color: "#888", width: "18px", flexShrink: 0 }}>{label}</span>
                              <input style={inp} type="number" value={editForm[field] || ""} onChange={e => handleEditChange(field, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="market-factor-col"></td>
                      <td className="value-col"></td>
                      <td className="image-col"></td>
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                          <button onClick={() => handleEditSave("new")} style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✓ Save</button>
                          <button onClick={handleEditCancel} style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}>✗ Cancel</button>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
                {displayedCards.map((card) => {
                  const g = parseFloat(card.grade);
                  const rookieVal = card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1 || card.rookie === true;
                  const isEditing = editingCardId === card.id;

                  let gradeClass = "grade-unknown";
                  if (!Number.isNaN(g)) {
                    if (g === 3) gradeClass = "grade-mt";
                    else if (g === 1.5) gradeClass = "grade-ex";
                    else if (g === 1) gradeClass = "grade-vg";
                    else if (g === 0.8) gradeClass = "grade-gd";
                    else if (g === 0.4) gradeClass = "grade-fr";
                    else gradeClass = "grade-pr";
                  }

                  const inp = { fontSize: "0.8rem", padding: "2px 4px", width: "100%", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #bbb" };

                  return (
                    <tr
                      key={card.id}
                      style={(() => {
                        if (isEditing) return { backgroundColor: "#f0f7ff", outline: "2px solid #1976d2" };
                        if (selectedIds.has(card.id)) return { backgroundColor: "#dceeff" };
                        if (Number(card.id) === Number(returnCardId))
                          return { backgroundColor: "#fffde7", outline: "2px solid #ffc107", transition: "background-color 0.5s" };
                        if (rookieVal && g === 3)
                          return { backgroundColor: settings?.row_color_rookie_grade3 || "#b8d8f7" };
                        if (g === 3)
                          return { backgroundColor: settings?.row_color_grade3 || "#e8dcff" };
                        if (rookieVal)
                          return { backgroundColor: settings?.row_color_rookie || "#fff3c4" };
                        return {};
                      })()}
                    >
                      {/* Checkbox — only in selection mode */}
                      {selectionMode && (
                        <td style={{ width: 32, textAlign: "center", padding: "0 4px" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(card.id)}
                            onChange={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(card.id)) next.delete(card.id);
                                else next.add(card.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                      )}
                      {/* First */}
                      <td className="fname-col">
                        {isEditing
                          ? <input style={inp} value={editForm.first_name || ""} onChange={e => handleEditChange("first_name", e.target.value)} />
                          : <span>{card.first_name}</span>}
                      </td>

                      {/* Last */}
                      <td className="lname-col">
                        {isEditing
                          ? <input style={inp} value={editForm.last_name || ""} onChange={e => handleEditChange("last_name", e.target.value)} />
                          : card.last_name}
                      </td>

                      {/* Year */}
                      <td className="year-col">
                        {isEditing
                          ? <input style={inp} type="number" value={editForm.year || ""} onChange={e => handleEditChange("year", e.target.value)} />
                          : card.year}
                      </td>

                      {/* Brand */}
                      <td className="brand-col">
                        {isEditing
                          ? <select style={inp} value={editForm.brand || ""} onChange={e => handleEditChange("brand", e.target.value)}>
                              {(settings?.card_makes || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          : card.brand && <span className="badge badge-brand">{card.brand}</span>}
                      </td>

                      {/* Card Number */}
                      <td className="card-number-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <input style={inp} value={editForm.card_number || ""} onChange={e => handleEditChange("card_number", e.target.value)} />
                          : card.front_image || card.back_image
                            ? <span style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }} onClick={() => navigate(`/card-detail/${card.id}`)}>{card.card_number}</span>
                            : <span>{card.card_number}</span>}
                      </td>

                      {/* Rookie */}
                      <td className="rookie-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <input type="checkbox" checked={!!Number(editForm.rookie)} onChange={e => handleEditChange("rookie", e.target.checked ? 1 : 0)} />
                          : rookieVal && <span className="rookie-badge">⭐</span>}
                      </td>

                      {/* Grade */}
                      <td className="grade-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <select style={inp} value={editForm.grade || ""} onChange={e => handleEditChange("grade", parseFloat(e.target.value))}>
                              {(settings?.card_grades || []).map(gr => <option key={gr} value={gr}>{gr}</option>)}
                            </select>
                          : card.grade && <span className={`badge badge-grade ${gradeClass}`}>{card.grade}</span>}
                      </td>

                      {/* Book */}
                      <td className="book-col" style={{ textAlign: "center" }}>
                        {isEditing
                          ? <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              {[["book_high","H"],["book_high_mid","HM"],["book_mid","M"],["book_low_mid","LM"],["book_low","L"]].map(([field, label]) => (
                                <div key={field} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                  <span style={{ fontSize: "0.7rem", color: "#888", width: "18px", flexShrink: 0 }}>{label}</span>
                                  <input style={inp} type="number" value={editForm[field] || ""} onChange={e => handleEditChange(field, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          : <>
                              {card.book_high && <span className="book-badge book-high">{card.book_high}</span>}
                              {card.book_high_mid && <span className="book-badge book-highmid">{card.book_high_mid}</span>}
                              {card.book_mid && <span className="book-badge book-mid">{card.book_mid}</span>}
                              {card.book_low_mid && <span className="book-badge book-lowmid">{card.book_low_mid}</span>}
                              {card.book_low && <span className="book-badge book-low">{card.book_low}</span>}
                            </>}
                      </td>

                      {/* Market Factor */}
                      <td className="market-col market-factor-col" style={{ textAlign: "center" }}>
                        {typeof card.market_factor === "number" ? (
                          (() => {
                            const f = card.market_factor;
                            let badgeClass = "badge-market-mid";
                            if (f >= 0.85) badgeClass = "badge-market-low";
                            else if (f <= 0.5) badgeClass = "badge-market-high";
                            return <span className={`badge-market ${badgeClass}`}>{f.toFixed(2)}</span>;
                          })()
                        ) : null}
                      </td>

                      {/* Card Value */}
                      <td className="value-col" style={{ textAlign: "center" }}>
                        {(() => {
                          const rounded = Math.round(Number(card.value) || 0);
                          let valueClass = "value-low";
                          if (rounded >= 500) valueClass = "value-high";
                          else if (rounded >= 200) valueClass = "value-mid";
                          else if (rounded >= 50) valueClass = "value-lowmid";
                          return <span className={`badge badge-value ${valueClass}`}>{fmtDollar(rounded)}</span>;
                        })()}
                      </td>

                      {/* Card Image */}
                      <td className="image-col" style={{ textAlign: "center" }}>
                        {card.front_image ? (
                          <img
                            src={`http://host.docker.internal:8000${card.front_image}`}
                            alt="Front"
                            style={{ width: "50px", height: "auto", cursor: "pointer" }}
                            onClick={() => setSelectedCard(card)}
                          />
                        ) : (
                          <span style={{ color: "#aaa" }}>No Image</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="action-col actions-col" style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEditSave(card.id)}
                              style={{ background: "#28a745", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}
                            >✓ Save</button>
                            <button
                              onClick={handleEditCancel}
                              style={{ background: "#6c757d", color: "white", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", width: "auto" }}
                            >✗ Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handleEditStart(card)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#1976d2", width: "auto" }}
                              title="Edit"
                            >✏️</button>
                            <button
                              onClick={() => handleDuplicate(card)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#28a745", width: "auto" }}
                              title="Copy"
                            >📋</button>
                            <button
                              onClick={() => handlePrintLabel(card)}
                              disabled={labelLoading === card.id}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#6c757d", width: "auto" }}
                              title="Print label"
                            >🖨️</button>
                            <button
                              onClick={() => handleDelete(card)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px 4px", color: "#dc3545", width: "auto" }}
                              title="Delete"
                            >✕</button>
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
      )}
      {selectedCard && (
        <CardImages card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
      <LabelPreviewModal
        labelData={labelData}
        onPrint={() => window.open(`/card-label/${labelData?.id}`, "_blank")}
        onClose={() => setLabelData(null)}
      />
    </div>
    </>
  );
}

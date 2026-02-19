// src/pages/ListCards.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import { Link } from "react-router-dom";
import CardImages from "../components/CardImages"

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
  const [showFilter, setShowFilter] = useState(false);
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sortConfig, setSortConfig] = React.useState(returnState.sortConfig ?? { key: null, direction: "asc" });
  const [returnCardId, setReturnCardId] = useState(returnState.returnCardId ?? null);
  const [pinnedCard, setPinnedCard] = useState(null);

  // Fetch the updated card directly so it's always visible regardless of current page
  useEffect(() => {
    if (!returnCardId) { setPinnedCard(null); return; }
    api.get(`/cards/${returnCardId}`)
      .then(res => setPinnedCard(res.data))
      .catch(() => setPinnedCard(null));
  }, [returnCardId]);

  const clearPin = () => { setReturnCardId(null); setPinnedCard(null); };

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

  // Load page of cards when page/limit changes
  useEffect(() => {
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

  // Reusable centered paging + limit control block
  const PagingBlock = () => (
    <div
      className="paging-controls"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem", // even spacing between items
        margin: "0.25rem 0",
        width: "100%",
      }}
    >
      {limit !== "all" && (
        <span
          onClick={prevPage}
          style={{
            cursor: page === 0 ? "not-allowed" : "pointer",
            opacity: page === 0 ? 0.3 : 1,
            fontSize: "1.2rem",
            userSelect: "none",
          }}
          aria-label="Previous page"
        >
          {"<"}
        </span>
      )}

      <label style={{ fontSize: "0.95rem" }}>
        Show{" "}
        <select
          value={limit}
          onChange={handleLimitChange}
          style={{ margin: "0 0.5rem" }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">All</option>
        </select>{" "}
        per page
      </label>

      {limit !== "all" && (
        <span
          onClick={nextPage}
          style={{
            cursor: (page + 1) * limit >= total ? "not-allowed" : "pointer",
            opacity: (page + 1) * limit >= total ? 0.3 : 1,
            fontSize: "1.2rem",
            userSelect: "none",
          }}
          aria-label="Next page"
        >
          {">"}
        </span>
      )}
    </div>
  );
  
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
  
    return matchesLastName && matchesBrand && matchesGrade;
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

        {/* Full-width header bar: title left, count right */}
        <div
          className="list-header"
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            padding: "0 1rem",
            boxSizing: "border-box",
            marginBottom: "0.5rem",
          }}
        >
        {/* Centered title */}
        <h2 className="page-header"
          style={{
            margin: "1rem 0",
            textAlign: "center",
            flexGrow: 1,
          }}
        >
          Card List
        </h2>

        {/* Count stays on the right */}
        <span
          style={{
            position: "absolute",
            right: "1rem",
            fontSize: "0.95rem",
            color: "#555",
            marginTop: "0rem",
            marginBottom: "0rem",
          }}
        >
          Showing <b>{sortedCards.length}</b> of <b>{total}</b> cards (Page {page + 1} of {totalPages})
        </span>
      </div>

        {/* ✅ Running Total Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "0rem",
            marginBottom: "0rem",
            paddingRight: "1rem",
          }}
        >
          <div
            style={{
              background: "#f8f9fa",
              color: "#2e7d32",
              fontSize: "0.95rem",
              padding: "0.2rem 0.75rem",
              borderRadius: "4px",
            }}
          >
            Value: {fmtDollar(totalValue)}
          </div>
        </div>


        <div style={{ clear: "both" }} />  {/* ensures layout resets after float */}
      
        {cards.length === 0 ? (
          <p style={{ textAlign: "center" }}>No cards found.</p>
        ) : (
          <div className="card-section" style={{ width: "100%", boxSizing: "border-box" }}>
            {/* Top paging */}
            <PagingBlock />

          {/* Filtering */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            {!showFilter ? (
              <button
                onClick={() => setShowFilter(true)}
                style={{
                background: "none",
                border: "none",
                color: "#007bff",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "0.9rem",
                }}
              >
                Show Filters
              </button>
            ) : (
              <div style={{ display: "inline-flex", gap: "3rem", marginLeft: "10rem", alignItems: "center" }}>
              
                {/* Last Name filter */}
                <div>
                  <label style={{ fontSize: "0.85rem" }}>
                  Last Name: {" "}
                  </label>
                  <input
                    type="text"
                    value={lastNameFilter}
                    onChange={(e) => setLastNameFilter(e.target.value)}
                    placeholder="Enter last name"
                    style={{
                      fontSize: "0.85rem",
                      padding: "2px 6px",
                      width: "140px",
                    }}
                  />
                </div>

                {/* Brand filter */}
                <div>
                  <label style={{ fontSize: "0.85rem" }}>
                    Brand: {" "}
                  </label>
                  <input
                    type="text"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    placeholder="Enter brand"
                    style={{ fontSize: "0.85rem", padding: "2px 6px", width: "140px" }}
                  />
                </div>

                {/* Grade filter */}
                <div>
                  <label style={{ fontSize: "0.85rem" }}>
                    Grade:{" "}
                  </label>
                  <input
                    type="text"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    placeholder="Enter grade"
                    style={{ fontSize: "0.85rem", padding: "2px 6px", width: "140px" }}
                  />
                </div>

                {/* Hide button */}
                <button
                  onClick={() => {
                    setShowFilter(false);
                    setLastNameFilter("");
                    setBrandFilter("");
                  }}
                  style={{
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    color: "#dc3545",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    textDecoration: "underline",
                  }}
                >
                  ✕ Hide Filters
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="table-scroll" style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>First</th>
                  <th onClick={() => requestSort("last_name")} style={{ cursor: "pointer" }}>Last {sortConfig.key === "last_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
                  <th onClick={() => requestSort("year")} style={{ cursor: "pointer" }}>Year {sortConfig.key === "year" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
                  <th className="brand-col">Brand</th>
                  <th className="card-number-col">Card #</th>
                  <th className="rookie-col" style={{ textAlign: "center", width: 70 }}>Rookie</th>

                  <th className="grade-col" style={{ textAlign: "center", width: 90, cursor: "pointer" }}
                      onClick={() => requestSort("grade")}>Grade {sortConfig.key === "grade" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  
                  <th className="book-col" style={{ textAlign: "center", minWidth: 220 }}>Book</th>
                  <th className="market-factor-col" style={{ textAlign: "center", width: 130 }}>Market Factor</th>
                  
                  <th className="card-value-col" style={{ textAlign: "center", width: 130, cursor: "pointer" }}
                      onClick={() => requestSort("card_value")}>Card Value {sortConfig.key === "card_value" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                                      
                  <th className="card-images-col" style={{ textAlign: "center", width: 140 }}>Images</th>                  
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCards.map((card) => {
                  // --- Market Factor calculation (frontend-only) ---
                  const g = parseFloat(card.grade);
                  const rookieVal = card.rookie === "*" || card.rookie === "1" ||  Number(card.rookie) === 1 || card.rookie === true;

                  // Grade badge class mapping (kept as you had it)
                  let gradeClass = "grade-unknown";
                  if (!Number.isNaN(g)) {
                    if (g === 3) gradeClass = "grade-mt";
                    else if (g === 1.5) gradeClass = "grade-ex";
                    else if (g === 1) gradeClass = "grade-vg";
                    else if (g === 0.8) gradeClass = "grade-gd";
                    else if (g === 0.4) gradeClass = "grade-fr";
                    else gradeClass = "grade-pr";
                  }

                  return (
                     <tr
                      key={card.id}
                      style={Number(card.id) === Number(returnCardId) ? {
                        backgroundColor: "#fffde7",
                        outline: "2px solid #ffc107",
                        transition: "background-color 0.5s"
                      } : {}}
                    >
                      <td className="fname-col">
                        <span>{card.first_name}</span>
                      </td>
                      <td className="lname-col">{card.last_name}</td>
                      <td className="year-col">{card.year}</td>
                      <td className="brand-col">
                        {card.brand && <span className="badge badge-brand">{card.brand}</span>}
                      </td>
                      
                      {/* Card Number is clickable (CardDetail) IF there are images */}
                      <td className="card-number-col" style={{ textAlign: "center" }}>
                        {card.front_image || card.back_image ? (
                          <span
                            style={{
                            cursor: "pointer",
                            color: "#007bff",
                            textDecoration: "underline",
                            }}
                            onClick={() => navigate(`/card-detail/${card.id}`)}
                          >
                            {card.card_number}
                          </span>
                        ) : (
                          <span>{card.card_number}</span>
                        )}
                      </td>

                      {/* Rookie */}
                      <td className="rookie-col" style={{ textAlign: "center" }}>
                        {rookieVal && <span className="rookie-badge">⭐</span>}
                      </td>

                      {/* Grade */}
                      <td className="grade-col" style={{ textAlign: "center" }}>
                        {card.grade && (
                          <span className={`badge badge-grade ${gradeClass}`}>
                            {card.grade}
                          </span>
                        )}
                      </td>

                      {/* Book badges */}
                      <td className="book-col" style={{ textAlign: "center" }}>
                        {card.book_high && (
                          <span className="book-badge book-high">{card.book_high}</span>
                        )}
                        {card.book_high_mid && (
                          <span className="book-badge book-highmid">{card.book_high_mid}</span>
                        )}
                        {card.book_mid && (
                          <span className="book-badge book-mid">{card.book_mid}</span>
                        )}
                        {card.book_low_mid && (
                          <span className="book-badge book-lowmid">{card.book_low_mid}</span>
                        )}
                        {card.book_low && (
                          <span className="book-badge book-low">{card.book_low}</span>
                        )}
                      </td>

                      {/* Market Factor */}
                      <td className="market-col market-factor-col" style={{ textAlign: "center" }}>
                        {typeof card.market_factor === "number" ? (
                          (() => {
                            const f = card.market_factor;
                            let badgeClass = "badge-market-mid";
                            if (f >= 0.85) badgeClass = "badge-market-low";   // your old palette
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
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <Link
                            to={`/update-card/${card.id}`}
                            state={{ sortConfig, limit, page }}
                            className="small-btn"
                          >
                            Update
                          </Link>
                          <Link 
                            to={`/delete-card/${card.id}`} 
                            className="small-btn"
                          >
                            Delete
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom paging */}
          <PagingBlock />
        </div>
      )}
      {selectedCard && (
        <CardImages card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
    </>
  );
}

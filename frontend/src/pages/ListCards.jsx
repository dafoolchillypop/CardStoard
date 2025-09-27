// src/pages/ListCards.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";
import CardImages from "../components/CardImages"

export default function ListCards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [settings, setSettings] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: "asc"});

  // Load count once
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get("http://host.docker.internal:8000/cards/count");
        setTotal(res.data.count);
      } catch (err) {
        console.error("Error fetching count:", err);
      }
    };
    fetchCount();
  }, []);

  // Load settings once
  useEffect(() => {
    axios
      .get("http://host.docker.internal:8000/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // Load page of cards when page/limit changes
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const skip = page * (limit === "all" ? total : limit);
        const url =
          limit === "all"
            ? `http://host.docker.internal:8000/cards/?skip=0&limit=${total}`
            : `http://host.docker.internal:8000/cards/?skip=${skip}&limit=${limit}`;
        const res = await axios.get(url);
        setCards(res.data);
      } catch (err) {
        console.error("Error fetching cards:", err);
      }
    };
    fetchCards();
  }, [page, limit]);

  const handleLimitChange = (e) => {
    const value = e.target.value;
    if (value === "all") {
      setLimit("all");
      setPage(0);
    } else {
      setLimit(parseInt(value, 10));
      setPage(0);
    }
  };
  
  const nextPage = () => {
    if ((page + 1) * limit < total) setPage((prev) => prev + 1);
  };

  const prevPage = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);

  // Reusable centered paging + limit control block
  const PagingBlock = () => (
    <div className="paging-controls" style={{ textAlign: "center", margin: "1rem 0", width: "100%" }}>
      {limit !== "all" && (
      <span
        onClick={prevPage}
        style={{
          cursor: page === 0 ? "not-allowed" : "pointer",
          opacity: page === 0 ? 0.3 : 1,
          marginRight: 12,
          fontSize: "1.2rem",
          userSelect: "none"
        }}
        aria-label="Previous page"
      >
        {"<"}
      </span>
      )}

      <label style={{ fontSize: "0.95rem" }}>
        Show{" "}
        <select value={limit} onChange={handleLimitChange} style={{ margin: "0 0.5rem" }}>
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
          marginLeft: 12,
          fontSize: "1.2rem",
          userSelect: "none"
        }}
        aria-label="Next page"
      >
        {">"}
      </span>
      )}
    </div>
  );
  
  const getMarketFactor = (card, settings) => {
    if (!settings) return 1; // fallback

    const g = parseFloat(card.grade);
    const isRookie =
      card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1;

    if (g === 3 && isRookie) return settings.auto_factor;
    else if (g === 3) return settings.mtgrade_factor;
    else if (isRookie) return settings.rookie_factor;
    else if (g === 1.5) return settings.exgrade_factor;
    else if (g === 1) return settings.vggrade_factor;
    else if (g === 0.8) return settings.gdgrade_factor;
    else if (g === 0.4) return settings.frgrade_factor;
    else if (g === 0.2) return settings.prgrade_factor;

    return 1; // default
  };

  // Filtering Fields
  const filteredCards = cards.filter((card) => {
    const matchesLastName = lastNameFilter
      ? card.last_name?.toLowerCase().includes(lastNameFilter.toLowerCase())
      : true;

    const matchesBrand = brandFilter
      ? card.brand?.toLowerCase().includes(brandFilter.toLowerCase())
      : true;

    const matchesGrade = gradeFilter
      ? card.grade?.toLowerCase().includes(gradeFilter.toLowerCase())
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
          case "card_value": {
            const avgBook =
              (Number(a.book_high) +
                Number(a.book_high_mid) +
                Number(a.book_mid) +
                Number(a.book_low_mid) +
                Number(a.book_low)) /
              5;

            const bAvgBook =
              (Number(b.book_high) +
                Number(b.book_high_mid) +
                Number(b.book_mid) +
                Number(b.book_low_mid) +
                Number(b.book_low)) /
              5;

            const aFactor = getMarketFactor(a, settings);
            const bFactor = getMarketFactor(b, settings);

            aVal = Math.round(avgBook * (Number(a.grade) || 0) * aFactor);
            bVal = Math.round(bAvgBook * (Number(b.grade) || 0) * bFactor);
            break;
          }
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

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

    return (
    <div className="container" style={{ width: "100%" }}>
      {/* Centered Back to Home link */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
      </div>

      {/* Full-width header bar: title left, count right */}
      <div
        className="list-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "0 1rem",
          boxSizing: "border-box",
          marginBottom: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Card List</h2>
        <span style={{ fontSize: "0.95rem", color: "#555" }}>
          Showing <b>{sortedCards.length}</b> of <b>{total}</b> cards (Page {page + 1} of {totalPages})
        </span>
      </div>

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
                  <input
                    type="text"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    placeholder="Enter grade"
                    style={{ fontSize: "0.85rem", padding: "2px 6px", width: "140px" }}
                  />
                </label>
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
                {sortedCards.map((card) => {
                  // --- Market Factor calculation (frontend-only) ---
                  let factor = null;
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
                     <tr key={card.id}>
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
                        {settings && (() => {
                          let factor = null;
                          const g = parseFloat(card.grade);
                          const rookieVal = card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1;

                          if (g === 3 && rookieVal) factor = settings.auto_factor;
                          else if (g === 3) factor = settings.mtgrade_factor;
                          else if (rookieVal) factor = settings.rookie_factor;
                          else if (g === 1.5) factor = settings.exgrade_factor;
                          else if (g === 1) factor = settings.vggrade_factor;
                          else if (g === 0.8) factor = settings.gdgrade_factor;
                          else if (g === 0.4) factor = settings.frgrade_factor;
                          else if (g === 0.2) factor = settings.prgrade_factor;

                          if (factor !== null) {
                            let badgeClass = "badge-market-mid";
                            if (factor >= 0.85) badgeClass = "badge-market-low";   // lighter
                            else if (factor <= 0.5) badgeClass = "badge-market-high"; // darker

                            return (
                              <span className={`badge-market ${badgeClass}`}>
                                {factor.toFixed(2)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>

                      {/* Card Value */}
                      <td className="value-col" style={{ textAlign: "center" }}>
                        {settings && (() => {
                          const books = [
                            parseFloat(card.book_high) || 0,
                            parseFloat(card.book_high_mid) || 0,
                            parseFloat(card.book_mid) || 0,
                            parseFloat(card.book_low_mid) || 0,
                            parseFloat(card.book_low) || 0,
                          ];

                          const avgBook = books.reduce((a, b) => a + b, 0) / books.length;
                          const g = parseFloat(card.grade) || 0;

                          // Market factor logic (same as before)
                          let factor = null;
                          const isRookie = card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1;

                          if (g === 3 && isRookie) factor = settings.auto_factor;
                          else if (g === 3) factor = settings.mtgrade_factor;
                          else if (isRookie) factor = settings.rookie_factor;
                          else if (g === 1.5) factor = settings.exgrade_factor;
                          else if (g === 1) factor = settings.vggrade_factor;
                          else if (g === 0.8) factor = settings.gdgrade_factor;
                          else if (g === 0.4) factor = settings.frgrade_factor;
                          else if (g === 0.2) factor = settings.prgrade_factor;

                          const cardValue = factor !== null ? avgBook * g * factor : null;

                          if (cardValue !== null) {
                            // Round to nearest dollar
                            const rounded = Math.round(cardValue);

                            // Pick shade of green based on value
                            let valueClass = "value-low";
                            if (rounded >= 500) valueClass = "value-high";
                            else if (rounded >= 200) valueClass = "value-mid";
                            else if (rounded >= 50) valueClass = "value-lowmid";

                            return (
                            <span className={`badge badge-value ${valueClass}`}>
                              ${rounded}
                            </span>
                            );
                          }
                          return null;
                        })()}
                      </td>

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
                        <Link to={`/update-card/${card.id}`} className="nav-btn">Update</Link>{" "}
                        <Link to={`/delete-card/${card.id}`} className="nav-btn">Delete</Link>
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
  );
}

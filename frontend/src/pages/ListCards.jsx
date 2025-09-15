// src/pages/ListCards.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ListCards() {
  const [cards, setCards] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [settings, setSettings] = useState(null);

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
        const skip = page * limit;
        const res = await axios.get(
          `http://host.docker.internal:8000/cards/?skip=${skip}&limit=${limit}`
        );
        setCards(res.data);
      } catch (err) {
        console.error("Error fetching cards:", err);
      }
    };
    fetchCards();
  }, [page, limit]);

  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value, 10));
    setPage(0); // reset to first page when limit changes
  };

  const nextPage = () => {
    if ((page + 1) * limit < total) setPage((prev) => prev + 1);
  };

  const prevPage = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const totalPages = Math.ceil(total / limit);

  // Reusable centered paging + limit control block
  const PagingBlock = () => (
    <div className="paging-controls" style={{ textAlign: "center", margin: "0.75rem 0", width: "100%" }}>
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

      <label style={{ fontSize: "0.95rem" }}>
        Show{" "}
        <select value={limit} onChange={handleLimitChange} style={{ margin: "0 0.5rem" }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>{" "}
        per page
      </label>

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
    </div>
  );

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
          Showing <b>{cards.length}</b> of <b>{total}</b> cards (Page {page + 1} of {totalPages})
        </span>
      </div>

      {cards.length === 0 ? (
        <p style={{ textAlign: "center" }}>No cards found.</p>
      ) : (
        <div className="card-section" style={{ width: "100%", boxSizing: "border-box" }}>
          {/* Top paging */}
          <PagingBlock />

          {/* Table */}
          <div className="table-scroll" style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>First</th>
                  <th>Last</th>
                  <th>Year</th>
                  <th className="brand-col">Brand</th>
                  <th className="card-number-col">Card #</th>
                  <th className="rookie-col" style={{ textAlign: "center", width: 70 }}>Rookie</th>
                  <th className="grade-col" style={{ textAlign: "center", width: 90 }}>Grade</th>
                  <th className="book-col" style={{ textAlign: "center", minWidth: 220 }}>Book</th>
                  <th className="market-factor-col" style={{ textAlign: "center", width: 130 }}>Market Factor</th>
                  <th className="card-value-col" style={{ textAlign: "center", width: 130 }}>Card Value</th>
                  <th className="action-col actions-col" style={{ textAlign: "center", width: 140 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
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
                      <td className="card-number-col">
                        <span>{card.card_number}</span>
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

                          return cardValue !== null ? (
                            <span className="badge badge-value">
                              {cardValue.toFixed(2)}
                            </span>
                          ) : null;
                        })()}
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
    </div>
  );
}

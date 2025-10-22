// src/pages/CardDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [sales, setSales] = useState([]); 
  const [window, setWindow] = useState("12"); // default 12-mo

  useEffect(() => {
    // Fetch card
    api.get(`/cards/${id}`)
      .then((res) => setCard(res.data))
      .catch((err) => console.error("Error fetching card:", err));

    // Fetch settings
    api.get("/settings/")
      .then((res) => setSettings(res.data))
      .catch((err) => console.error("Error fetching settings:", err));

    // Fetch valuation stats
    api.get(`/valuation/stats/${id}`)
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error fetching stats:", err));

    // Fetch trends (3 & 12 months)
    api.get(`/valuation/trends/${id}?windows=3,12`)
      .then((res) => setTrends(res.data.trends))
      .catch((err) => console.error("Error fetching trends:", err));

    // Fetch sales (latest)
    api.get(`/valuation/sales/${id}`)
      .then((res) => setSales(res.data))
      .catch((err) => console.error("Error fetching sales:", err));
  }, [id]);

  if (!card) return <p>Loading card...</p>;

  // ✅ Rookie check
  const isRookie =
    card.rookie === "*" || card.rookie === "1" || Number(card.rookie) === 1 || card.rookie === true;

  // ✅ Grade badge
  const g = parseFloat(card.grade);
  let gradeClass = "grade-unknown";
  if (!Number.isNaN(g)) {
    if (g === 3) gradeClass = "grade-mt";
    else if (g === 1.5) gradeClass = "grade-ex";
    else if (g === 1) gradeClass = "grade-vg";
    else if (g === 0.8) gradeClass = "grade-gd";
    else if (g === 0.4) gradeClass = "grade-fr";
    else gradeClass = "grade-pr";
  }

  // ✅ Market factor + card value calc
  let cardValue = null;
  if (settings) {
    const books = [
      parseFloat(card.book_high) || 0,
      parseFloat(card.book_high_mid) || 0,
      parseFloat(card.book_mid) || 0,
      parseFloat(card.book_low_mid) || 0,
      parseFloat(card.book_low) || 0,
    ];
    const avgBook = books.reduce((a, b) => a + b, 0) / books.length;
    let factor = null;

    if (g === 3 && isRookie) factor = settings.auto_factor;
    else if (g === 3) factor = settings.mtgrade_factor;
    else if (isRookie) factor = settings.rookie_factor;
    else if (g === 1.5) factor = settings.exgrade_factor;
    else if (g === 1) factor = settings.vggrade_factor;
    else if (g === 0.8) factor = settings.gdgrade_factor;
    else if (g === 0.4) factor = settings.frgrade_factor;
    else if (g === 0.2) factor = settings.prgrade_factor;

    if (factor !== null) {
      cardValue = Math.round(avgBook * g * factor);
    }
  }

  let valueClass = "value-low";
  if (cardValue !== null) {
    if (cardValue >= 500) valueClass = "value-high";
    else if (cardValue >= 200) valueClass = "value-mid";
    else if (cardValue >= 50) valueClass = "value-lowmid";
  }

  return (
    <>
      <AppHeader />
      <div style={{ textAlign: "center" }}>
        {/* Heading */}
        <h2>
          {card.year} {card.brand} {card.first_name} {card.last_name} #{card.card_number}
          {isRookie && (
            <span className="rookie-badge" style={{ marginLeft: "0.5rem" }}>⭐ (RC)</span>
          )}
        </h2>

        {/* Grade + Value badges */}
        <div style={{ margin: "0.5rem 0" }}>
          {card.grade && (
            <span className={`badge badge-grade ${gradeClass}`}>Grade: {card.grade}</span>
          )}
          {cardValue !== null && (
            <span className={`badge badge-value ${valueClass}`}>Value: ${cardValue}</span>
          )}
        </div>

        {/* Images */}
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "1rem" }}>
          {card.front_image && (
            <img
              src={`http://host.docker.internal:8000${card.front_image}`}
              alt="Front"
              style={{ maxWidth: "800px", height: "auto" }}
            />
          )}
          {card.back_image && (
            <img
              src={`http://host.docker.internal:8000${card.back_image}`}
              alt="Back"
              style={{ maxWidth: "800px", height: "auto" }}
            />
          )}
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="card-section">
            <h3>Valuation Stats</h3>
            <p>
              Count: {stats.count} | Min: ${stats.min} | Max: ${stats.max} | 
              Avg: ${stats.avg} | Last Sale: {stats.last_sale_date}
            </p>
          </div>
        )}

        {/* Trends Section */}
        {trends.length > 0 && (
          <div className="card-section">
            <h3>Price Trends</h3>
            <div className="actions">
              <button 
                className={window === "3" ? "nav-btn" : ""} 
                onClick={() => setWindow("3")}
              >
                3-Month
              </button>
              <button 
                className={window === "12" ? "nav-btn" : ""} 
                onClick={() => setWindow("12")}
              >
                12-Month
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg_price" stroke="#8884d8" name="Monthly Avg" />
                {window === "3" && <Line type="monotone" dataKey="rolling_3mo" stroke="#82ca9d" name="3-Mo Rolling" />}
                {window === "12" && <Line type="monotone" dataKey="rolling_12mo" stroke="#ff7300" name="12-Mo Rolling" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Sales Section */}
        {sales.length > 0 && (
          <div className="card-section">
            <h3>Recent Sales (eBay)</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {sales
                    .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
                    .slice(0, 15)
                    .map((s) => (
                      <tr key={s.id}>
                        <td>{s.sale_date}</td>
                        <td>${s.price.toFixed(2)}</td>
                        <td>
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            View on eBay
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Placeholders */}
        <div className="card-section">
          <h3>CardLadder (Coming Soon)</h3>
          <p style={{ color: "gray" }}>Integration not yet available.</p>
        </div>
        <div className="card-section">
          <h3>Beckett (Coming Soon)</h3>
          <p style={{ color: "gray" }}>Integration not yet available.</p>
        </div>

        {/* Back link */}
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link to="/list-cards" className="nav-btn">⬅ Back to List</Link>
        </div>
      </div>
    </>
  );
}

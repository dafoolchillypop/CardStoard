// src/pages/Analytics.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function Analytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // 🔌 Placeholder API call — we’ll implement the backend route later
    api.get("/analytics/summary")
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error fetching analytics:", err));
  }, []);

  if (!stats) return <p>Loading analytics...</p>;

  return (
    <div className="container" style={{ textAlign: "center" }}>
      <h2 className="page-header">📈 Collection Analytics</h2>

      {/* ✅ Summary Boxes */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        margin: "2rem 0"
      }}>
        <div className="summary-box">Total Cards: {stats.total_cards}</div>
        <div className="summary-box">Collection Value: ${stats.total_value}</div>
        <div className="summary-box">Unique Players: {stats.unique_players}</div>
        <div className="summary-box">Brands: {stats.brands_count}</div>
      </div>

      {/* ✅ Placeholder Trend Graphs */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Value Trend Over Time</h3>
        <div style={{
          height: "250px",
          background: "#f0f0f0",
          border: "1px dashed #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          [Graph Placeholder]
        </div>
      </div>

      <div style={{ margin: "2rem 0" }}>
        <h3>Collection Growth Over Time</h3>
        <div style={{
          height: "250px",
          background: "#f0f0f0",
          border: "1px dashed #ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          [Graph Placeholder]
        </div>
      </div>

      {/* ✅ Breakdown Tables */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Breakdown by Brand</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Count</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {stats.by_brand.map((row, i) => (
              <tr key={i}>
                <td>{row.brand}</td>
                <td>{row.count}</td>
                <td>${row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ margin: "2rem 0" }}>
        <h3>Breakdown by Year</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Count</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {stats.by_year.map((row, i) => (
              <tr key={i}>
                <td>{row.year}</td>
                <td>{row.count}</td>
                <td>${row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ margin: "2rem 0" }}>
        <h3>Breakdown by Player</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Count</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {stats.by_player.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.count}</td>
                <td>${row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

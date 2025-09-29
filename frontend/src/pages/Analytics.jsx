// src/pages/Analytics.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar} from "recharts";

export default function Analytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/analytics")
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
        <div className="summary-box">Total Cards: {stats.total_count}</div>
        <div className="summary-box">Collection Value: ${stats.total_value}</div>
        <div className="summary-box">Unique Players: {stats.by_player.length}</div>
        <div className="summary-box">Brands: {stats.by_brand.length}</div>
      </div>

      {/* ✅ Value Trend */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Value Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.trend} width={600} height={300}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" name="Value" />
            <Line type="monotone" dataKey="count" stroke="#82ca9d" name="Count" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ Count Trend */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Collection Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.trend_count}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
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

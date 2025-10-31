// src/pages/Analytics.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";
import AppHeader from "../components/AppHeader"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Dollar Formatting
const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

// Combined Trend Datasets
const mergeTrends = (inventory = [], valuation = []) => {
  const map = {};
  inventory.forEach((i) => {
    map[i.month] = { month: i.month, count: i.count, value: i.value };
  });
  valuation.forEach((v) => {
    if (!map[v.month]) map[v.month] = { month: v.month, count: 0, value: 0 };
    map[v.month].value = v.value;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
};

export default function Analytics() {
  const [stats, setStats] = useState(null);

  // Sorting states
  const [brandSort, setBrandSort] = useState({ column: "brand", direction: "asc" });
  const [yearSort, setYearSort] = useState({ column: "year", direction: "asc" });
  const [playerSort, setPlayerSort] = useState({ column: "name", direction: "asc" });

  useEffect(() => {
    api
      .get("/analytics/")
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error fetching analytics:", err));
  }, []);

  if (!stats) return <p>Loading analytics...</p>;

  // Reusable sorter
  const sortData = (data, sortConfig) => {
    return [...data].sort((a, b) => {
      const { column, direction } = sortConfig;
      let x = a[column];
      let y = b[column];

      if (typeof x === "string") x = x.toLowerCase();
      if (typeof y === "string") y = y.toLowerCase();

      if (x < y) return direction === "asc" ? -1 : 1;
      if (x > y) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Sorted tables
  const sortedByBrand = sortData(stats.by_brand, brandSort);
  const sortedByYear = sortData(stats.by_year, yearSort);
  const sortedByPlayer = sortData(stats.by_player, playerSort);

  // Toggle helpers
  const toggleSort = (setFn, current, column) => {
    setFn((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

  // Arrows
  const renderSortArrow = (sortConfig, column) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  return (
    <>
    <AppHeader />
    <div className="container" style={{ textAlign: "center" }}>

      <h2 className="page-header">📈 Collection Analytics</h2>

      {/* ✅ Summary Boxes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          margin: "2rem 0",
        }}
      >
        <div className="summary-box">Total Cards: {stats.total_cards}</div>
        <div className="summary-box">
          Collection Value: {fmtDollar(stats.total_value)}
        </div>
        <div className="summary-box">
          Unique Players: {stats.by_player.length}
        </div>
      </div>

      // ✅ Trend Section with 3-way toggle (Inventory / Valuation / Combined)
      <div style={{ margin: "2rem 0" }}>
        <h3>Collection Trends</h3>

        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={() => setActiveTrend("inventory")}
            style={{
              marginRight: "0.5rem",
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTrend === "inventory" ? "#517fd4" : "#ccc",
              color: activeTrend === "inventory" ? "#fff" : "#000",
            }}
          >
            📦 Inventory
          </button>

          <button
            onClick={() => setActiveTrend("valuation")}
            style={{
              marginRight: "0.5rem",
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTrend === "valuation" ? "#167e30" : "#ccc",
              color: activeTrend === "valuation" ? "#fff" : "#000",
            }}
          >
            💰 Valuation
          </button>

          <button
            onClick={() => setActiveTrend("combined")}
            style={{
              padding: "0.4rem 1rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            backgroundColor: activeTrend === "combined" ? "#444" : "#ccc",
            color: activeTrend === "combined" ? "#fff" : "#000",
            }}
          >
            📊 Combined
          </button>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          {activeTrend === "inventory" && (
            <BarChart data={stats.trend_inventory || stats.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#517fd4" name="Cards Added" />
              <Bar dataKey="value" fill="#8baaf5" name="Value (Est.)" />
            </BarChart>
          )}

          {activeTrend === "valuation" && (
            <LineChart data={stats.trend_valuation || stats.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#167e30"
                strokeWidth={2}
                name="Total Value"
              />
            </LineChart>
          )}

          {activeTrend === "combined" && (
            <ComposedChart data={mergeTrends(stats.trend_inventory, stats.trend_valuation)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" label={{ value: "Cards", angle: -90, position: "insideLeft" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: "Value ($)", angle: -90, position: "insideRight" }}
              />
              <Tooltip formatter={(v, n) => (n === "Value" ? fmtDollar(v) : v)} />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#517fd4" name="Cards Added" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                stroke="#167e30"
                strokeWidth={2}
                name="Total Value"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>


      {/* ✅ Breakdown by Brand */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Breakdown by Brand</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setBrandSort, brandSort, "brand")}>
                Brand{renderSortArrow(brandSort, "brand")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setBrandSort, brandSort, "count")}>
                Count{renderSortArrow(brandSort, "count")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setBrandSort, brandSort, "value")}>
                Total Value{renderSortArrow(brandSort, "value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedByBrand.map((row, i) => (
              <tr key={i}>
                <td>{row.brand}</td>
                <td>{row.count}</td>
                <td>{fmtDollar(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Breakdown by Year */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Breakdown by Year</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setYearSort, yearSort, "year")}>
                Year{renderSortArrow(yearSort, "year")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setYearSort, yearSort, "count")}>
                Count{renderSortArrow(yearSort, "count")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setYearSort, yearSort, "value")}>
                Total Value{renderSortArrow(yearSort, "value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedByYear.map((row, i) => (
              <tr key={i}>
                <td>{row.year}</td>
                <td>{row.count}</td>
                <td>{fmtDollar(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Breakdown by Player */}
      <div style={{ margin: "2rem 0" }}>
        <h3>Breakdown by Player</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setPlayerSort, playerSort, "name")}>
                Player{renderSortArrow(playerSort, "name")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setPlayerSort, playerSort, "count")}>
                Count{renderSortArrow(playerSort, "count")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort(setPlayerSort, playerSort, "value")}>
                Total Value{renderSortArrow(playerSort, "value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedByPlayer.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.count}</td>
                <td>{fmtDollar(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

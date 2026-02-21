// src/pages/Analytics.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import AppHeader from "../components/AppHeader";
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
  ComposedChart,
} from "recharts";

// --- Dollar formatting helper ---
const fmtDollar = (n) => {
  const val = Math.round(Number(n || 0));
  return `$${val.toLocaleString()}`;
};

// --- Merge inventory + valuation trend datasets for combined chart ---
const mergeTrends = (inventory = [], valuation = []) => {
  const map = {};
  inventory.forEach((i) => {
    map[i.month] = { month: i.month, count: i.count || 0, value: i.value || 0 };
  });
  valuation.forEach((v) => {
    if (!map[v.month]) map[v.month] = { month: v.month, count: 0, value: 0 };
    map[v.month].value = v.value || 0;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
};

export default function Analytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  // --- Sorting states ---
  const [brandSort, setBrandSort] = useState({ column: "brand", direction: "asc" });
  const [yearSort, setYearSort] = useState({ column: "year", direction: "asc" });
  const [playerSort, setPlayerSort] = useState({ column: "name", direction: "asc" });

  // --- Trend view toggle ---
  const [activeTrend, setActiveTrend] = useState("inventory"); // "inventory" | "valuation" | "combined"

  useEffect(() => {
    api
      .get("/analytics/")
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error fetching analytics:", err));
  }, []);

  if (!stats) return <p style={{ textAlign: "center" }}>Loading analytics...</p>;

  // --- Sort helper ---
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

  // --- Sorted tables ---
  const sortedByBrand = sortData(stats.by_brand, brandSort);
  const sortedByYear = sortData(stats.by_year, yearSort);
  const sortedByPlayer = sortData(stats.by_player, playerSort);

  // --- Sort toggle + arrow renderers ---
  const toggleSort = (setFn, current, column) => {
    setFn((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

  const renderSortArrow = (sortConfig, column) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  // --- Trend data placeholders ---
  const trendInventory = stats?.trend_inventory || stats?.trend || [];
  const trendValuation = stats?.trend_valuation || stats?.trend || [];
  const trendCombined = mergeTrends(trendInventory, trendValuation);

  return (
    <>
      <AppHeader />
      <div className="container" style={{ textAlign: "center", maxWidth: "1000px", margin: "0 auto", padding: "0 2rem", }}>
        <h2 className="page-header">📈 Collection Analytics</h2>

        {/* --- Summary boxes --- */}
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

        {/* --- Trend Section --- */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Collection Trends</h3>

          {/* --- Toggle buttons --- */}
          <div style={{ marginBottom: "1rem" }}>
            {[
              { key: "inventory", label: "📦 Inventory", color: "#517fd4" },
              { key: "valuation", label: "💰 Valuation", color: "#167e30" },
              { key: "combined", label: "📊 Combined", color: "#444" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setActiveTrend(opt.key)}
                style={{
                  marginRight: "0.5rem",
                  padding: "0.4rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: activeTrend === opt.key ? opt.color : "#ccc",
                  color: activeTrend === opt.key ? "#fff" : "#000",
                  transition: "background-color 0.2s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* --- Chart rendering with guards --- */}
          {stats && (
            <ResponsiveContainer width="100%" height={320}>
              {(() => {
                if (
                  activeTrend === "inventory" &&
                  Array.isArray(trendInventory) &&
                  trendInventory.length > 0
                ) {
                  return (
                    <BarChart data={trendInventory} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#517fd4" name="Cards Added" />
                    </BarChart>
                  );
                }

                if (
                  activeTrend === "valuation" &&
                  Array.isArray(trendValuation) &&
                  trendValuation.length > 0
                ) {
                  return (
                    <LineChart data={trendValuation} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v) => fmtDollar(v)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#167e30"
                        strokeWidth={2}
                        name="Total Value"
                      />
                    </LineChart>
                  );
                }

                if (
                  activeTrend === "combined" &&
                  Array.isArray(trendCombined) &&
                  trendCombined.length > 0
                ) {
                  return (
                    <ComposedChart data={trendCombined} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        yAxisId="left"
                        label={{ value: "Cards", position: "bottom", offset: 10, style: { fill: "#517fd4", fontWeight: "bold" },}}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: "Value ($)", position: "bottom", offset: 10, style: { fill: "#167e30", fontWeight: "bold" }, }}
                      />
                      <Tooltip
                        formatter={(v, n) => (n?.includes("Value") ? fmtDollar(v) : v)}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="count"
                        fill="#517fd4"
                        name="Cards Added"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="value"
                        stroke="#167e30"
                        strokeWidth={2}
                        name="Total Value"
                      />
                    </ComposedChart>
                  );
                }

                // ✅ fallback when no trend data is present
                return (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: "16px", fill: "#666" }}
                  >
                    No trend data available
                  </text>
                );
              })()}
            </ResponsiveContainer>
          )}
        </div>

        {/* --- Breakdown by Brand --- */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Breakdown by Brand</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort(setBrandSort, brandSort, "brand")}
                  style={{ cursor: "pointer" }}
                >
                  Brand{renderSortArrow(brandSort, "brand")}
                </th>
                <th
                  onClick={() => toggleSort(setBrandSort, brandSort, "count")}
                  style={{ cursor: "pointer" }}
                >
                  Count{renderSortArrow(brandSort, "count")}
                </th>
                <th
                  onClick={() => toggleSort(setBrandSort, brandSort, "value")}
                  style={{ cursor: "pointer" }}
                >
                  Total Value{renderSortArrow(brandSort, "value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByBrand.map((row, i) => (
                <tr key={i}>
                  <td
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
                    onClick={() => navigate("/list-cards", { state: { brandFilter: row.brand, limit: "all", showFilter: true } })}
                  >{row.brand}</td>
                  <td>{row.count}</td>
                  <td>{fmtDollar(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Breakdown by Year --- */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Breakdown by Year</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort(setYearSort, yearSort, "year")}
                  style={{ cursor: "pointer" }}
                >
                  Year{renderSortArrow(yearSort, "year")}
                </th>
                <th
                  onClick={() => toggleSort(setYearSort, yearSort, "count")}
                  style={{ cursor: "pointer" }}
                >
                  Count{renderSortArrow(yearSort, "count")}
                </th>
                <th
                  onClick={() => toggleSort(setYearSort, yearSort, "value")}
                  style={{ cursor: "pointer" }}
                >
                  Total Value{renderSortArrow(yearSort, "value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByYear.map((row, i) => (
                <tr key={i}>
                  <td
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
                    onClick={() => navigate("/list-cards", { state: { yearFilter: String(row.year), limit: "all", showFilter: true } })}
                  >{row.year}</td>
                  <td>{row.count}</td>
                  <td>{fmtDollar(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Breakdown by Player --- */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Breakdown by Player</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort(setPlayerSort, playerSort, "name")}
                  style={{ cursor: "pointer" }}
                >
                  Player{renderSortArrow(playerSort, "name")}
                </th>
                <th
                  onClick={() => toggleSort(setPlayerSort, playerSort, "count")}
                  style={{ cursor: "pointer" }}
                >
                  Count{renderSortArrow(playerSort, "count")}
                </th>
                <th
                  onClick={() => toggleSort(setPlayerSort, playerSort, "value")}
                  style={{ cursor: "pointer" }}
                >
                  Total Value{renderSortArrow(playerSort, "value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByPlayer.map((row, i) => (
                <tr key={i}>
                  <td
                    style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
                    onClick={() => {
                      const lastName = row.name.split(" ").slice(-1)[0];
                      navigate("/list-cards", { state: { lastNameFilter: lastName, limit: "all", showFilter: true } });
                    }}
                  >{row.name}</td>
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

import React from "react";
import AppHeader from "../components/AppHeader";
import { Link } from "react-router-dom";

const sectionStyle = {
  background: "#f9f9f9",
  borderRadius: "10px",
  padding: "1rem 1.25rem",
  marginBottom: "1.25rem",
  boxShadow: "inset 0 0 4px rgba(0,0,0,0.05)",
};

const h3Style = {
  color: "#1e88e5",
  borderBottom: "1px solid #e0e0e0",
  paddingBottom: "0.25rem",
  marginBottom: "0.75rem",
  marginTop: 0,
};

export default function About() {
  return (
    <>
      <AppHeader />

      <div
        style={{
          maxWidth: "800px",
          margin: "2rem auto",
          padding: "0 1rem 2rem",
          lineHeight: "1.7",
        }}
      >
        <h2 className="page-header" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          📘 About CardStoard
        </h2>

        {/* Purpose */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🎯 Purpose</h3>
          <p style={{ margin: 0 }}>
            <strong>CardStoard</strong> is a personal web application built for collectors who want a fast,
            simple, and powerful way to manage and value their sports card collections. It was designed
            with speed, accuracy, and simplicity in mind — built by a collector, for collectors. At its
            core is a configurable valuation engine that estimates market value based on book values,
            card grade, and rookie status, giving you a real-time picture of what your collection is worth.
          </p>
        </div>

        {/* Getting Around */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🧭 Getting Around</h3>
          <p style={{ marginTop: 0 }}>The navigation bar at the top gives you quick access to everything:</p>
          <ul style={{ marginBottom: 0 }}>
            <li><strong>➕ Add Card</strong> — manually enter a new card into your collection</li>
            <li><strong>📋 My Cards</strong> — browse, filter, sort, and manage your full collection</li>
            <li><strong>📈 Analytics</strong> — charts and trends across your collection</li>
            <li><strong>⚙️</strong> (gear icon) — Admin: settings, valuation factors, player dictionary, card import, and data management</li>
            <li><strong>Your username</strong> — account settings, password changes, and multi-factor authentication</li>
            <li><strong>💬</strong> (chat icon, if enabled) — AI-powered Collection Assistant</li>
          </ul>
        </div>

        {/* Core Features */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🧩 Core Features</h3>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Collection Management</p>
          <ul style={{ marginTop: 0 }}>
            <li>Add, edit, and delete cards with front &amp; back image uploads</li>
            <li>Bulk <Link to="/import-help" style={{ color: "#1e88e5", fontWeight: 600 }}>import</Link> from CSV</li>
            <li>Filter and sort by player, brand, year, grade, and rookie status</li>
            <li>Row highlights: Mint grade (lavender), Rookie (gold), Rookie + Mint (rose)</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Valuation Engine</p>
          <ul style={{ marginTop: 0 }}>
            <li>Book value inputs: Hi, Hi-Mid, Mid, Lo-Mid, Lo</li>
            <li>Configurable grade factors (MT, EX, VG, GD, FR, PR) and Rookie multiplier</li>
            <li>Apply global revaluation across your entire collection from Admin</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Player Dictionary</p>
          <ul style={{ marginTop: 0 }}>
            <li>Searchable database of players, brands, years, and card numbers — seeded with 867+ entries</li>
            <li>Smart Fill: auto-populates card number and rookie flag when adding cards</li>
            <li>Import dictionary entries via CSV; add and edit individual entries</li>
            <li>In-collection highlights: dictionary rows matching your cards appear in green</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Analytics</p>
          <ul style={{ marginTop: 0 }}>
            <li>Collection breakdown by brand, year, and player</li>
            <li>Total value tracking with historical trend charts</li>
            <li>Inventory growth over time</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Data Management</p>
          <ul style={{ marginTop: 0 }}>
            <li>Extract card data as CSV, TSV, or JSON for use in external tools</li>
            <li>Full backup (cards + settings) and restore — available in Admin</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Collection Assistant</p>
          <ul style={{ marginTop: 0 }}>
            <li>AI-powered chat with context about your collection (powered by Claude)</li>
            <li>Enable or disable from Admin settings</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Account &amp; Security</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li>Email verification and secure JWT session handling</li>
            <li>Optional TOTP multi-factor authentication</li>
            <li>Update username, email, and password from your Account page</li>
          </ul>
        </div>

        {/* Version */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>📦 Current Version</h3>
          <p style={{ margin: 0 }}><strong>CardStoard v1.3</strong></p>
        </div>

        {/* Recent Updates */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🆕 Recent Updates (v1.3)</h3>
          <ul style={{ marginBottom: 0 }}>
            <li>Redesigned navigation bar — streamlined primary actions, gear icon for Admin</li>
            <li>Player Dictionary with Smart Fill integration (867+ seeded entries)</li>
            <li>Data Management: extract (CSV / TSV / JSON), full backup, and restore</li>
            <li>Row color coding across My Cards and Player Dictionary</li>
            <li>Collection Assistant chatbot (AI-powered, toggle in Admin)</li>
            <li>Admin consolidation: card import, dictionary tools, and data management all in one place</li>
            <li>Analytics enhancements: year filtering and valuation history trend</li>
          </ul>
        </div>

        {/* Disclaimer */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>📜 Disclaimer</h3>
          <p style={{ margin: 0 }}>
            CardStoard is a personal project and is not affiliated with or endorsed by any sports
            or grading organizations. All card images and valuations are user-generated or based
            on publicly available market data.
          </p>
        </div>

        {/* Contact */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>📩 Contact</h3>
          <p style={{ margin: 0 }}>
            Feedback or issues? Email: <strong>cardstoard@gmail.com</strong>
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#888", marginTop: "1rem" }}>
          © CardStoard {new Date().getFullYear()} — All rights reserved.
        </p>
      </div>
    </>
  );
}

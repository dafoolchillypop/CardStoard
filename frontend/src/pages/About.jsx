import React from "react";
import AppHeader from "../components/AppHeader";
import { Link } from "react-router-dom";

const sectionStyle = {
  background: "var(--bg-muted)",
  borderRadius: "10px",
  padding: "1rem 1.25rem",
  marginBottom: "1.25rem",
  boxShadow: "inset 0 0 4px rgba(0,0,0,0.08)",
};

const h3Style = {
  color: "var(--accent-blue-dark)",
  borderBottom: "1px solid var(--border)",
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
          <ul style={{ marginBottom: "0.5rem" }}>
            <li><strong>📋 My Cards</strong> — browse, filter, sort, edit, and manage your full collection</li>
            <li><strong>📈 Analytics</strong> — charts and trends across your collection</li>
            <li><strong>⚙️</strong> (gear icon) — Admin: settings, valuation factors, player dictionary, card import, and data management</li>
            <li><strong>Your username</strong> — account settings, password changes, and multi-factor authentication</li>
            <li><strong>💬</strong> (chat icon, if enabled) — AI-powered Collection Assistant</li>
            <li><strong>📘 About</strong> — this page</li>
          </ul>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
            For a step-by-step walkthrough of every feature, see the{" "}
            <Link to="/user-guide" style={{ color: "var(--link)", fontWeight: 600 }}>User Guide</Link>.
          </p>
        </div>

        {/* Core Features */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🧩 Core Features</h3>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Collection Management</p>
          <ul style={{ marginTop: 0 }}>
            <li>Add, edit, and delete cards with front &amp; back image uploads</li>
            <li>Inline editing directly in the card list — no page navigation required</li>
            <li>Bulk <Link to="/import-help" style={{ color: "var(--link)", fontWeight: 600 }}>import</Link> from CSV</li>
            <li>Filter by player, brand, year, grade, and rookie status</li>
            <li>Advanced multi-column sort with saved default sort order</li>
            <li>Book values auto-propagate to all matching cards on save</li>
            <li>Row highlights: Mint grade (lavender), Rookie (gold), Rookie + Mint (rose)</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Valuation Engine</p>
          <ul style={{ marginTop: 0 }}>
            <li>Book value inputs: Hi, Hi-Mid, Mid, Lo-Mid, Lo</li>
            <li>Configurable grade factors (MT, EX, VG, GD, FR, PR) and Rookie multiplier</li>
            <li>Apply global revaluation across your entire collection from Admin</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Label Printing &amp; QR Codes</p>
          <ul style={{ marginTop: 0 }}>
            <li>Print a single card label with a live preview — Avery 6427 format (1.75" × 0.75")</li>
            <li>Batch printing: select individual cards or print your entire collection at once</li>
            <li>Each label includes a QR code — public shareable card view via QR scan <em>(coming soon)</em></li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Player Dictionary</p>
          <ul style={{ marginTop: 0 }}>
            <li>Searchable database of players, brands, years, and card numbers — seeded with 867+ entries</li>
            <li>Smart Fill: auto-populates card number and rookie flag when adding or editing cards</li>
            <li>Player name autocomplete with Tab / Enter key completion</li>
            <li>Import dictionary entries via CSV; add and edit individual entries</li>
            <li>In-collection highlights: dictionary rows matching your cards appear in green</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Analytics</p>
          <ul style={{ marginTop: 0 }}>
            <li>Collection breakdown by brand, year, and player — click any row to filter your card list</li>
            <li>Total value tracking with historical trend charts (Inventory, Valuation, Combined)</li>
            <li>Inventory growth over time; year filter for focused analysis</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Data Management</p>
          <ul style={{ marginTop: 0 }}>
            <li>Extract card data as CSV, TSV, or JSON for use in external tools</li>
            <li>Full backup (cards + settings) and restore — available in Admin</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Collection Assistant</p>
          <ul style={{ marginTop: 0 }}>
            <li>AI-powered chat with context about your collection (powered by Claude)</li>
            <li>Accurate counts via pre-computed player, grade, and brand summaries</li>
            <li>Enable or disable from Admin settings</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Account &amp; Security</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li>Email verification and secure JWT session handling with auto token refresh</li>
            <li>Optional TOTP multi-factor authentication <em>(coming soon)</em></li>
            <li>Update username, email, and password from your Account page</li>
            <li>Dark mode — toggle in Admin, persists across sessions</li>
          </ul>
        </div>

        {/* Version */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>📦 Current Version</h3>
          <p style={{ margin: 0 }}><strong>CardStoard v1.6</strong></p>
        </div>

        {/* Recent Updates */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🆕 Recent Updates</h3>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.6 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Book value propagation — changes update all matching cards automatically</li>
            <li>Advanced multi-column sort modal with saved default sort order</li>
            <li>Batch label printing — print selected cards or full collection</li>
            <li>Inline edit UX — saved cards land in correct sorted position</li>
            <li>Dark mode now applies before page render (no more flash of light mode)</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.5 (February 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Player dictionary expanded to 867+ entries (Topps 1952–1980)</li>
            <li>Player name autocomplete with Tab / Enter key</li>
            <li>In-collection green highlights in dictionary view</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.4 (February 2026)</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li>Dark mode — full CSS theme system, per-user toggle in Admin</li>
            <li>Account management UX improvements</li>
            <li>EC2 deploy automation with pre-deploy database backup</li>
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

        <p style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--text-faint)", marginTop: "1rem" }}>
          © CardStoard {new Date().getFullYear()} — All rights reserved.
        </p>
      </div>
    </>
  );
}

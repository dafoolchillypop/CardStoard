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
            <li>Each label includes a QR code — scan to open a public shareable view (cards and sets/binders)</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Player Dictionary</p>
          <ul style={{ marginTop: 0 }}>
            <li>Searchable database of players, brands, years, and card numbers — 1,875+ entries covering Topps 1952–1980, Bowman 1948–1955, Fleer 1960–1963, Donruss 1981–1990, Upper Deck 1989</li>
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
          <p style={{ margin: 0 }}><strong>CardStoard v1.17</strong></p>
        </div>

        {/* Recent Updates */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>🆕 Recent Updates</h3>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.17 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Code quality improvements — 0 bugs, 0 vulnerabilities (SonarCloud)</li>
            <li>Accessibility improvements across card list, set cards, modals, and image viewer</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.16 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Collection Assistant (Cy) now knows about all inventory types — ask about your Balls, Wax Boxes, Wax Packs, and Sets/Binders</li>
            <li>Login with either your username or email address</li>
            <li>Code quality improvements (SonarCloud remediations)</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.15 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Wax Boxes: new inventory type for sealed wax boxes (year, brand, Cello/Rack/Std type badge, quantity, value freshness, label print + QR)</li>
            <li>Wax Packs: new inventory type for individual packs (year, brand, Cello/Rack/Wax/Blister type badge, quantity, value freshness, label print + QR)</li>
            <li>📦 Wax and 🎴 Packs nav buttons activated</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.14 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Auto Balls: new inventory type for autographed baseballs (signer, brand, commissioner, COA auth badge, inscription, value, label print + QR)</li>
            <li>⚾ Balls nav button activated — full list page with inline editing, freshness tracking, and label printing</li>
            <li>Pin / bookmark now persisted to your account profile (follows you across devices)</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.13 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Value Dictionary: book values stored on dictionary entries (brand + year + card number)</li>
            <li>Smart Fill now auto-populates all 5 book value tiers when adding a card</li>
            <li>Admin: seed book values from existing cards; bulk import via CSV</li>
            <li>Dictionary list: Values column shows which entries have book values on file</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.12 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Inline code documentation added to 21 key backend and frontend files</li>
            <li>File-level headers, function docstrings, and component descriptions throughout</li>
            <li>No feature or logic changes — documentation only</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.11 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Dictionary expanded to 97 players / 1,875+ entries — added Bowman 1948–1955, Fleer 1960–1963, Donruss/Fleer/Upper Deck 1981–1990</li>
            <li>Smart Fill now covers major brands for the modern era (Griffey Jr., Bonds, Clemens, Mattingly, Puckett, Ripken, and more)</li>
            <li>Full vintage set checklists in Sets/Builds: Bowman 1948–1955 (8 sets) and Fleer 1959–1963 (4 sets)</li>
            <li>All Topps 1952–1990 set checklists corrected to 100% complete (39 sets, 24,674 entries)</li>
            <li>seed_dictionary.py changed to additive — new player entries auto-seed on deploy without wiping existing data</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.10 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Sets/Binders renamed from Boxes/Binders; Builds renamed from Sets in nav</li>
            <li>CS-ST-XXXXXX identifier + Avery 6427 label printing with QR code for Sets/Binders</li>
            <li>Set Detail page with stats, editable notes, label printing, and prev/next navigation</li>
            <li>Notes appear as a 4th line on set/binder labels; QR scan opens public set view</li>
            <li>Inline action controls for Sets/Binders: copy, detail, print</li>
            <li>Quantity and total columns for Sets/Binders</li>
            <li>Nav bar customization — show/hide nav buttons per user (Admin)</li>
            <li>Last login date/time displayed on Account page</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.9 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Sets — browse Topps 1952–1990 checklists (39 sets, 17,504 cards) and track your build</li>
            <li>Boxes &amp; Binders — track complete sets as inventory items (factory, collated, binder)</li>
            <li>Per-user set visibility — Admin chip picker to choose which sets appear on your Sets page</li>
            <li>Sort modal improvements — wider modal, save-as-default for Boxes sort</li>
            <li>Analytics combined chart Y-axis label fix; nav bar cleanup</li>
          </ul>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>v1.8 (March 2026)</p>
          <ul style={{ marginTop: 0 }}>
            <li>Pin / bookmark any row — persists across sessions; auto-pins after every save</li>
            <li>Book freshness ↻ button — reset timer per row or in bulk from Admin</li>
            <li>CD player nav controls replace pagination in the Cards list</li>
            <li>Clone / edit scroll preservation — table stays in place after saves</li>
          </ul>

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

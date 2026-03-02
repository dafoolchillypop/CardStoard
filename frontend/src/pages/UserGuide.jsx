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

const h4Style = {
  fontWeight: 600,
  marginBottom: "0.25rem",
  marginTop: "0.75rem",
  color: "var(--text-secondary)",
};

export default function UserGuide() {
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
        <h2 className="page-header" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          📖 User Guide
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          A step-by-step walkthrough of every CardStoard feature. See <Link to="/about" style={{ color: "var(--link)" }}>About</Link> for a feature overview.
        </p>

        {/* 1. Getting Started */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>1. Getting Started</h3>

          <p style={{ marginTop: 0, fontWeight: 600, marginBottom: "0.25rem" }}>Create an account</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click <strong>Register</strong> on the login page and fill in your username, email, and password.</li>
            <li>Check your inbox for a verification email and click the link to activate your account.</li>
            <li>Log in with your email and password.</li>
          </ol>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Navigation bar</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li><strong>📋 My Cards</strong> — your main collection table</li>
            <li><strong>📈 Analytics</strong> — charts and breakdowns</li>
            <li><strong>⚙️ Admin</strong> — settings, valuation factors, dictionary, import/export</li>
            <li><strong>Your username</strong> — account settings and security</li>
            <li><strong>💬 Chat</strong> (if enabled in Admin) — AI Collection Assistant</li>
          </ul>
        </div>

        {/* 2. My Cards */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>2. My Cards — Managing Your Collection</h3>

          <p style={{ marginTop: 0 }}>
            My Cards is your primary workspace. Navigate to it using the <strong>📋 My Cards</strong> button in the header.
          </p>

          <p style={h4Style}>Adding a card</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click the <strong>＋</strong> button in the top-right corner of the table header.</li>
            <li>Fill in the fields in the new row that appears at the top of the table: First Name, Last Name, Year, Brand, Card #, Rookie checkbox, Grade, and Book Values.</li>
            <li>Click <strong>✓ Save</strong> to add the card, or <strong>✗ Cancel</strong> to discard.</li>
          </ol>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 0 }}>
            Tip: If Smart Fill is enabled in Admin, the card number and rookie flag will auto-populate as you type the player name.
            Press Tab or Enter on a name field to accept the suggested completion.
          </p>

          <p style={h4Style}>Editing a card</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click the <strong>✏️</strong> icon in a card's action column.</li>
            <li>Edit any fields directly in the table row.</li>
            <li>Click <strong>✓ Save</strong>. If you changed book values, they automatically propagate to all other cards with the same player, brand, year, and card number.</li>
          </ol>

          <p style={h4Style}>Duplicating and deleting</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>📋 Duplicate</strong> — creates a copy of the card and opens it for editing immediately.</li>
            <li><strong>✕ Delete</strong> — asks for confirmation before permanently removing the card.</li>
          </ul>

          <p style={h4Style}>Filtering</p>
          <p style={{ marginTop: 0 }}>
            Click the <strong>🔍</strong> icon next to the <em>Last Name</em>, <em>Year</em>, <em>Brand</em>, or <em>Grade</em>
            column headers to open an inline filter input. Filters combine — you can filter by last name and grade at the same time.
            Click <strong>✕ Clear filters</strong> in the toolbar to reset all filters at once.
          </p>

          <p style={h4Style}>Sorting</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Quick sort</strong> — click a column header (Last, Year, Grade, Card Value) to sort by that column. Click again to reverse direction. A ▲ or ▼ indicator shows the active direction.</li>
            <li><strong>Advanced sort</strong> — click <strong>⇅ Sort</strong> in the right toolbar to open the sort modal. Add up to 9 levels, each with its own column and ASC/DESC direction. Check <em>"Set as my default sort order"</em> to save this configuration to your profile — it will apply automatically every time you open My Cards.</li>
            <li>The Sort button turns <span style={{ color: "#1a7a1a", fontWeight: 600 }}>green</span> when a custom sort is active and shows the number of active levels.</li>
          </ul>

          <p style={h4Style}>Pagination</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Use the selector in the centre toolbar to show <strong>10 / 25 / 50 / 100 / All</strong> cards per page.
            The <strong>&lt;</strong> and <strong>&gt;</strong> arrows page through results. The total value shown updates to reflect the current filtered view.
          </p>
        </div>

        {/* 3. Label Printing */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>3. Label Printing &amp; QR Codes</h3>

          <p style={{ marginTop: 0 }}>
            CardStoard generates Avery 6427 labels (1.75" × 0.75") with a QR code and card details for each card.
            QR codes link to a public card view page that can be shared without logging in.
          </p>

          <p style={h4Style}>Print a single label</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click the <strong>🖨️</strong> icon in any card's action column.</li>
            <li>A preview modal opens showing the label at 3× scale.</li>
            <li>Click <strong>Print</strong> to open the browser print dialog.</li>
          </ol>

          <p style={h4Style}>Print selected cards</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click <strong>Select to Print</strong> in the left toolbar.</li>
            <li>Check the boxes next to the cards you want to print. Use the header checkbox to select all visible cards.</li>
            <li>Click <strong>🖨️ Print Selected (N)</strong> — the label build page opens and the print dialog launches automatically.</li>
            <li>Click <strong>✕ Cancel</strong> at any time to exit selection mode.</li>
          </ol>

          <p style={h4Style}>Print all labels</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Click <strong>🖨️ Print All</strong> in the right toolbar. Labels for your entire collection are generated
            and the print dialog opens automatically. A <strong>✕ Cancel</strong> button is available while the labels are loading.
          </p>
        </div>

        {/* 4. Valuation Engine */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>4. Valuation Engine</h3>

          <p style={{ marginTop: 0 }}>
            Every card's value is computed server-side each time you save. The formula is:
          </p>
          <pre style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6,
            padding: "0.6rem 0.9rem", fontSize: "0.85rem", overflowX: "auto",
          }}>
{`avg_book  = mean(Hi, Hi-Mid, Mid, Lo-Mid, Lo)
value     = round(avg_book × grade_factor × rookie_factor × era_factor)`}
          </pre>

          <p style={h4Style}>Book values</p>
          <p style={{ marginTop: 0 }}>
            Enter up to five price points for each card: <strong>Hi</strong>, <strong>Hi-Mid</strong>, <strong>Mid</strong>, <strong>Lo-Mid</strong>, <strong>Lo</strong>.
            The engine averages whichever fields are populated. Updating book values on one card propagates to all cards
            with the same player, brand, year, and card number.
          </p>

          <p style={h4Style}>Grade conditions</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginTop: 0 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Grade</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Condition</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Default Factor</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["3.0", "MT — Mint", "0.85"],
                ["1.5", "NM-MT — Near Mint–Mint", "0.75"],
                ["1.0", "EX-MT — Excellent–Mint", "0.60"],
                ["0.8", "VG-EX — Very Good–Excellent", "0.55"],
                ["0.4", "GD — Good", "0.50"],
                ["0.2", "PR — Poor / Fair", "0.40"],
              ].map(([g, label, factor]) => (
                <tr key={g} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "4px 8px", fontWeight: 600 }}>{g}</td>
                  <td style={{ padding: "4px 8px" }}>{label}</td>
                  <td style={{ padding: "4px 8px" }}>{factor}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ ...h4Style, marginTop: "0.75rem" }}>Rookie multiplier</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Rookie cards receive an additional multiplier (default 0.80). The Auto factor (default 1.00) applies
            to the MT + Rookie combination. All factors are adjustable in{" "}
            <Link to="/admin" style={{ color: "var(--link)" }}>Admin → Valuation Factors</Link>.
            Click <strong>Revalue All</strong> to reapply current factors to every card in your collection.
          </p>
        </div>

        {/* 5. Player Dictionary & Smart Fill */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>5. Player Dictionary &amp; Smart Fill</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/dictionary" style={{ color: "var(--link)" }}>Player Dictionary</Link> is a reference
            database of player names, brands, years, and card numbers. It is seeded with 867+ entries covering
            Topps sets from 1952–1980. Dictionary entries that match cards in your collection are highlighted in green.
          </p>

          <p style={h4Style}>Smart Fill</p>
          <ol style={{ marginTop: 0 }}>
            <li>Enable Smart Fill in <Link to="/admin" style={{ color: "var(--link)" }}>Admin → Features</Link>.</li>
            <li>When adding or editing a card, type the player's first and last name.</li>
            <li>Smart Fill automatically fills in the card number and rookie flag from the dictionary.</li>
            <li>On name fields, press <strong>Tab</strong> or <strong>Enter</strong> to accept a suggested name completion.</li>
          </ol>

          <p style={h4Style}>Managing dictionary entries</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li>Browse, filter, and sort entries at <Link to="/dictionary" style={{ color: "var(--link)" }}>/dictionary</Link>.</li>
            <li>Click <strong>✏️</strong> to edit an entry inline, or <strong>＋</strong> in the header to add a new one.</li>
            <li>Updating a player's rookie year prompts you to apply the change across all entries for that player.</li>
            <li>Bulk import entries via CSV from Admin → Dictionary → Import CSV.</li>
          </ul>
        </div>

        {/* 6. Analytics */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>6. Analytics</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/analytics" style={{ color: "var(--link)" }}>Analytics</Link> dashboard gives you a high-level
            view of your collection's composition and value over time.
          </p>

          <p style={h4Style}>Summary totals</p>
          <p style={{ marginTop: 0 }}>
            The top of the page shows total cards, total collection value, and unique player count.
          </p>

          <p style={h4Style}>Charts</p>
          <p style={{ marginTop: 0 }}>
            Toggle between three views:
          </p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Inventory</strong> — bar chart of cards added per month</li>
            <li><strong>Valuation</strong> — line chart of total collection value over time</li>
            <li><strong>Combined</strong> — dual Y-axis chart showing both together</li>
          </ul>
          <p style={{ marginTop: 0 }}>Use the <strong>Year</strong> filter to focus on a specific period.</p>

          <p style={h4Style}>Breakdown tables</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            The Brand, Year, and Player tables show count and total value for each group.
            Click any row to navigate to My Cards pre-filtered to that group.
          </p>
        </div>

        {/* 7. Admin */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>7. Admin Settings</h3>

          <p style={{ marginTop: 0 }}>
            All administrative tools are consolidated on the <Link to="/admin" style={{ color: "var(--link)" }}>Admin</Link> page.
          </p>

          <p style={h4Style}>Feature toggles</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Smart Fill</strong> — enable/disable dictionary-based auto-population</li>
            <li><strong>Collection Assistant</strong> — enable/disable the AI chatbot (requires Anthropic API key)</li>
            <li><strong>Dark Mode</strong> — toggle the dark colour theme; persists across sessions</li>
          </ul>

          <p style={h4Style}>Card brands</p>
          <p style={{ marginTop: 0 }}>
            Manage the list of card brands available in the Brand dropdown when adding/editing cards.
            Type a brand name and press Enter or comma to add it; click the × on a chip to remove it.
          </p>

          <p style={h4Style}>Valuation factors</p>
          <p style={{ marginTop: 0 }}>
            Adjust the multipliers used by the valuation engine (grade factors, rookie factor, era factors).
            Changes are debounced and saved automatically. Click <strong>Revalue All Cards</strong> to recompute
            every card's value with the updated factors.
          </p>

          <p style={h4Style}>Row colours</p>
          <p style={{ marginTop: 0 }}>
            Customise the highlight colours for Mint cards, Rookie cards, and the Rookie + Mint combination
            using the colour pickers. Click <strong>Restore Defaults</strong> to reset to the original colours.
          </p>

          <p style={h4Style}>Dictionary tools</p>
          <ul style={{ marginTop: 0 }}>
            <li>View/Edit dictionary, Import CSV, Add Entry — all accessible directly from Admin.</li>
          </ul>

          <p style={h4Style}>Card Import</p>
          <p style={{ marginTop: 0 }}>
            Import cards in bulk from a CSV file. Use the <strong>Validate</strong> button to check your file
            before importing. See the <Link to="/import-help" style={{ color: "var(--link)" }}>Import Help</Link> page
            for the required column format.
          </p>

          <p style={h4Style}>Data Management</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li><strong>Extract</strong> — download your cards as CSV, TSV, or JSON.</li>
            <li><strong>Backup</strong> — download a full backup (cards + settings) as JSON.</li>
            <li><strong>Restore</strong> — upload a backup file to replace your collection. This is irreversible — back up first.</li>
          </ul>
        </div>

        {/* 8. Account & Security */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>8. Account &amp; Security</h3>

          <p style={{ marginTop: 0 }}>
            Access your account settings by clicking your username in the top-right of the navigation bar.
          </p>

          <p style={h4Style}>Change username or password</p>
          <ul style={{ marginTop: 0 }}>
            <li>Enter a new username and click <strong>Update Username</strong>.</li>
            <li>To change your password, enter your current password and your new password (twice). Password requirements: 8+ characters, uppercase, lowercase, number, and special character.</li>
          </ul>

          <p style={h4Style}>Multi-factor authentication (TOTP)</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click <strong>Set Up MFA</strong> in your Account page.</li>
            <li>Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.).</li>
            <li>Enter the 6-digit code to confirm setup.</li>
            <li>On future logins, you will be prompted for a TOTP code after entering your password.</li>
          </ol>

          <p style={h4Style}>Delete account</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Clicking <strong>Delete Account</strong> permanently removes your account, all cards, and all settings.
            This action cannot be undone. A confirmation dialog requires you to confirm before proceeding.
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--text-faint)", marginTop: "1rem" }}>
          © CardStoard {new Date().getFullYear()} — All rights reserved.
        </p>
      </div>
    </>
  );
}

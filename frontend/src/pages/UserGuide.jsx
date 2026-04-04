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
            <li>Log in with your email address <em>or</em> username and password.</li>
          </ol>

          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Navigation bar</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li><strong>📋 My Cards</strong> — your main collection table</li>
            <li><strong>📈 Analytics</strong> — charts and breakdowns</li>
            <li><strong>⚙️ Admin</strong> — settings, valuation factors, dictionary, import/export</li>
            <li><strong>Your username</strong> — account settings and security</li>
            <li><strong>💬 Chat</strong> (if enabled in Admin) — AI Collection Assistant (Cy); knows about all inventory types</li>
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
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 0 }}>
            Tip: If Image AI is enabled in Admin, click the <strong>📷 Scan Card</strong> button to photograph or upload a card.
            The AI identifies the player, brand, year, and card number and pre-fills the form for you to review before saving.
          </p>

          <p style={h4Style}>Editing a card</p>
          <ol style={{ marginTop: 0 }}>
            <li>Click the <strong>✏️</strong> icon in a card's action column.</li>
            <li>Edit any fields directly in the table row.</li>
            <li>Click <strong>✓ Save</strong>. If you changed book values, they automatically propagate to all other cards with the same player, brand, year, and card number.</li>
          </ol>

          <p style={h4Style}>Card Detail</p>
          <p style={{ marginTop: 0 }}>
            Click the <strong>ℹ️</strong> icon in the action column (or a card's underlined card number if it has images)
            to open the Card Detail page. See <strong>Section 3</strong> below for a full walkthrough.
          </p>

          <p style={h4Style}>Duplicating and deleting</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>📋 Duplicate</strong> — creates a copy of the card and inserts it directly below the source row, opened for editing. The table order is frozen until you save or cancel; cancelling removes the copy.</li>
            <li><strong>✕ Delete</strong> — asks for confirmation before permanently removing the card.</li>
          </ul>

          <p style={h4Style}>Book freshness refresh</p>
          <p style={{ marginTop: 0 }}>
            Each row's Book column contains a small <strong>↻</strong> button (visible when book values are entered).
            Click it to mark today as the book-value update date without opening edit mode — useful for confirming
            prices are current after a quick check. The left border freshness indicator updates immediately.
          </p>

          <p style={h4Style}>Pin / bookmark</p>
          <p style={{ marginTop: 0 }}>
            Click the <strong>📌</strong> icon in any row's action column to pin that row. The pinned row is highlighted
            and your selection is stored in your account profile — it follows you across devices and sessions. Saving any card
            automatically pins that row so you don't lose your place. To jump back to your pinned row from anywhere
            in the list, click the <strong>📌</strong> button in the table header — the pinned row scrolls to the
            centre of the view. Click the pin icon again on the same row to unpin.
          </p>

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

          <p style={h4Style}>Table Navigation (CD Controls)</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            All cards always load at once. The action column header contains a compact navigation block:
          </p>
          <ul style={{ marginTop: "0.4rem" }}>
            <li><strong>|◄ / ►|</strong> — jump instantly to the top or bottom of the list.</li>
            <li><strong>▲ / ▼</strong> — jump up or down by the selected jump rate.</li>
            <li><strong>Jump rate selector</strong> — choose 25 / 50 / 100 / 250 rows per jump step.</li>
            <li><strong>📌</strong> — jump to your currently pinned row.</li>
            <li><strong>＋</strong> — open the inline new-card entry row.</li>
          </ul>
          <p style={{ marginTop: "0.4rem", marginBottom: 0 }}>
            The centre toolbar shows the total card count and total collection value for the current filtered view.
          </p>
        </div>

        {/* 3. Card Detail */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>3. Card Detail</h3>

          <p style={{ marginTop: 0 }}>
            The Card Detail page shows a full view of a single card. Open it by clicking the <strong>ℹ️</strong> icon
            in the action column, or by clicking the underlined card number of any card that has images attached.
          </p>

          <p style={h4Style}>What's shown</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Label ID</strong> — the unique <code>CS-CD-XXXXXX</code> identifier printed on the physical label.</li>
            <li><strong>Last updated</strong> — date and time the card record was last modified.</li>
            <li><strong>Duplicate count</strong> — if you own multiple copies, a link shows the count and filters My Cards to those cards.</li>
            <li><strong>Grade badge</strong> — condition grade with colour coding.</li>
            <li><strong>Calculated value</strong> — computed from your book values and grade factors.</li>
            <li><strong>Value change indicator</strong> — a green ↑ or red ↓ appears if the card's value changed within the past 90 days, with the old and new values shown on hover.</li>
            <li><strong>Book freshness</strong> — a label shows if book values are aging (&gt; 30 days, amber) or stale (&gt; 90 days, red). If book values have <em>never</em> been entered, the label <strong>"Book: never updated"</strong> is clickable — clicking it returns you to My Cards with that card open for editing. A <strong>↻</strong> button next to the freshness label resets the timer to today without leaving the page.</li>
            <li><strong>Card images</strong> — front and back images at full size.</li>
          </ul>

          <p style={h4Style}>Notes</p>
          <p style={{ marginTop: 0 }}>
            Use the <strong>Notes</strong> text area to record anything about the card (provenance, condition details, purchase history, etc.).
            Click <strong>Save Notes</strong> to persist them.
          </p>

          <p style={h4Style}>Actions</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>🖨️ Print Label</strong> — opens a label preview modal; click Print to send to your browser's print dialog.</li>
            <li><strong>⬅ Back to List</strong> — returns to My Cards.</li>
          </ul>

          <p style={h4Style}>Navigating between cards</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            When you open Card Detail from My Cards, <strong>← Previous Card</strong> and <strong>Next Card →</strong> buttons
            appear below the other actions. They step through your collection in the same sort order as the list you came from.
            These buttons are not shown when accessing a card directly by URL.
          </p>
        </div>

        {/* 4. Label Printing */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>4. Label Printing &amp; QR Codes</h3>

          <p style={{ marginTop: 0 }}>
            CardStoard generates Avery 6427 labels (1.75" × 0.75") with a QR code and card details for each card.
            Each label includes a QR code — a public shareable card view accessible via QR scan is <em>coming soon</em>.
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

        {/* 6. Player Dictionary & Smart Fill */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>6. Player Dictionary &amp; Smart Fill</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/dictionary" style={{ color: "var(--link)" }}>Player Dictionary</Link> is a reference
            database of player names, brands, years, and card numbers. It is seeded with 28,800+ entries covering
            Topps 1952–1990 (every player), Bowman 1948–1955, Fleer 1959–1963, Donruss 1981–1990, and Upper Deck 1989.
            Dictionary entries that match cards in your collection are highlighted in green.
          </p>

          <p style={h4Style}>Smart Fill</p>
          <ol style={{ marginTop: 0 }}>
            <li>Enable Smart Fill in <Link to="/admin" style={{ color: "var(--link)" }}>Admin → Features</Link>.</li>
            <li>When adding a card, type the player's first and last name, then select brand and year.</li>
            <li>Smart Fill automatically fills in the card number, rookie flag, and all 5 book value tiers from the dictionary.</li>
            <li>On name fields, press <strong>Tab</strong> or <strong>Enter</strong> to accept a suggested name completion.</li>
          </ol>

          <p style={h4Style}>Value Dictionary</p>
          <p style={{ marginTop: 0 }}>
            The Value Dictionary stores book values (High → Low) for dictionary entries keyed on brand + year + card number.
            When Smart Fill fires, it first resolves the card number, then immediately looks up book values and populates all 5 tiers automatically.
          </p>
          <ul style={{ marginTop: 0 }}>
            <li>Admin can seed book values from existing cards via <Link to="/admin" style={{ color: "var(--link)" }}>Admin → Value Dictionary → Seed from My Cards</Link>.</li>
            <li>Bulk import book values via CSV from Admin → Value Dictionary → Import Values CSV. Format: Brand, Year, CardNumber, BookHigh, BookHighMid, BookMid, BookLowMid, BookLow. All 5 tiers required per row.</li>
            <li>The Dictionary list shows a <strong>✓</strong> in the Values column for entries that have book values on file.</li>
          </ul>

          <p style={h4Style}>Managing dictionary entries</p>
          <ul style={{ marginTop: 0, marginBottom: 0 }}>
            <li>Browse, filter, and sort entries at <Link to="/dictionary" style={{ color: "var(--link)" }}>/dictionary</Link>.</li>
            <li>Click <strong>✏️</strong> to edit an entry inline, or <strong>＋</strong> in the header to add a new one.</li>
            <li>Updating a player's rookie year prompts you to apply the change across all entries for that player.</li>
            <li>Bulk import entries via CSV from Admin → Dictionary → Import CSV.</li>
          </ul>
        </div>

        {/* 7. Sets */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>7. Sets</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/sets" style={{ color: "var(--link)" }}>Sets</Link> page lets you browse global set
            checklists and track which cards you own in each set. CardStoard ships with 39 Topps sets
            (1952–1990) covering 17,504 cards.
          </p>

          <p style={h4Style}>Browsing sets</p>
          <ul style={{ marginTop: 0 }}>
            <li>The set list shows each set's name, brand, year, total entries, and how many you own.</li>
            <li>Click a set row to open the full checklist.</li>
            <li>Use the column 🔍 icons to filter by year, brand, or name.</li>
          </ul>

          <p style={h4Style}>Tracking your build</p>
          <ul style={{ marginTop: 0 }}>
            <li>In a set checklist, click <strong>＋</strong> on any row to add that card to your build.</li>
            <li>Rows in your build are highlighted green. Edit grade, book values, and notes inline.</li>
            <li>Book freshness indicators (amber / red border) appear once book values are entered.</li>
          </ul>

          <p style={h4Style}>Set visibility</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Only sets you've selected appear on your Sets page. Manage visibility in{" "}
            <Link to="/admin" style={{ color: "var(--link)" }}>Admin → Set Visibility</Link> — use the
            brand chip picker to select or deselect entire brands, or toggle individual sets.
          </p>
        </div>

        {/* 8. Sets/Binders */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>8. Sets/Binders</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/boxes" style={{ color: "var(--link)" }}>Sets/Binders</Link> page tracks complete
            sets as standalone inventory items — factory-sealed boxes, hand-collated sets, or binder-organised sets.
          </p>

          <p style={h4Style}>Item types</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Factory</strong> (blue badge) — factory-sealed complete set box</li>
            <li><strong>Collated</strong> (amber badge) — hand-assembled complete set</li>
            <li><strong>Binder</strong> (green badge) — binder-organised set</li>
          </ul>

          <p style={h4Style}>Adding &amp; editing</p>
          <ul style={{ marginTop: 0 }}>
            <li>Click <strong>＋</strong> in the header to add a new item (brand, year, name, type, quantity, value, notes).</li>
            <li>Value is entered directly — no grade-based calculation is applied. Total = quantity × value.</li>
            <li>Click any row to edit inline. Click ✓ to save or ✕ to cancel.</li>
          </ul>

          <p style={h4Style}>Row actions</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>📋</strong> — duplicate the row and open for editing.</li>
            <li><strong>ℹ️</strong> — open the Set Detail page for the full view.</li>
            <li><strong>🖨️</strong> — open the label preview modal; click Print to print an Avery 6427 label with QR code.</li>
          </ul>

          <p style={h4Style}>Set Detail page</p>
          <p style={{ marginTop: 0 }}>
            The Set Detail page shows the <strong>CS-ST-XXXXXX</strong> identifier, type badge, stats (qty / value / total / added),
            and an editable notes field. Use <strong>← Previous Set</strong> / <strong>Next Set →</strong> to step
            through items in the same sort order as the list. The <strong>🖨️ Print Label</strong> button generates
            an Avery 6427 label with QR code; notes appear as a 4th line when present. Scanning the QR code opens
            a public view of the set — no login required.
          </p>

          <p style={h4Style}>Navigation &amp; sort</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Use the CD player controls in the header (|◄ ▲ ▼ ►|) to jump to the top, bottom, or step
            through items. Click <strong>Sort</strong> in the toolbar to configure a multi-level sort order
            and optionally save it as your default.
          </p>
        </div>

        {/* 9. Auto Balls */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>9. Auto Balls</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/balls" style={{ color: "var(--link)" }}>Auto Balls</Link> page tracks autographed
            baseballs as a first-class collection type. Each ball records the signer's name, brand, commissioner
            stamp, Certificate of Authenticity (COA) status, inscription, value, and notes.
          </p>

          <p style={h4Style}>Adding &amp; editing</p>
          <ul style={{ marginTop: 0 }}>
            <li>Click <strong>＋</strong> in the header to add a new ball inline (first name, last name required).</li>
            <li>Click <strong>✏️</strong> or any row to edit inline. Click ✓ to save or ✕ to cancel.</li>
            <li>The <strong>COA</strong> checkbox sets the auth flag — the row badge updates to <span style={{ background: "#16a34a", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>AUTH</span> or <span style={{ background: "#9ca3af", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>UNAUTH</span>.</li>
          </ul>

          <p style={h4Style}>Value freshness</p>
          <p style={{ marginTop: 0 }}>
            The Value cell has a left-border freshness indicator — green (&lt; 30 days), amber (30–90 days), or red (&gt; 90 days / never set).
            Click the <strong>↻</strong> button next to any value to confirm it is current and reset the freshness timer to today.
          </p>

          <p style={h4Style}>Row actions</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>📌</strong> — pin the row; pin persists across sessions in your account profile.</li>
            <li><strong>📋</strong> — duplicate the row and open for editing.</li>
            <li><strong>🖨️</strong> — open the label preview and print an Avery 6427 label (CS-BL-XXXXXX + name + inscription + QR code).</li>
            <li><strong>ℹ️</strong> — open the public ball view in a new tab (no login required).</li>
            <li><strong>✕</strong> — delete with confirmation.</li>
          </ul>

          <p style={h4Style}>Navigation &amp; sort</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Use the CD player controls (|◄ ▲ ▼ ►|) to jump through the list. Click <strong>⇅ Sort</strong>
            in the toolbar to configure a multi-level sort order and optionally save it as your default.
            Filter by last name, brand, or auth status using the <strong>🔍</strong> column icons.
          </p>
        </div>

        {/* 10. Wax Boxes */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>10. Wax Boxes</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/wax" style={{ color: "var(--link)" }}>Wax Boxes</Link> page tracks sealed wax boxes
            as a first-class inventory type. Each item records the year, brand, box type, quantity, value, and notes.
          </p>

          <p style={h4Style}>Adding &amp; editing</p>
          <ul style={{ marginTop: 0 }}>
            <li>Click <strong>＋</strong> in the header to add a new wax box inline (year and brand required).</li>
            <li>Click <strong>✏️</strong> or any row to edit inline. Click ✓ to save or ✕ to cancel.</li>
            <li>The <strong>Type</strong> dropdown sets the box type — <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Cello</span>, <span style={{ background: "#d97706", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Rack</span>, or <span style={{ background: "#16a34a", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Std</span>.</li>
          </ul>

          <p style={h4Style}>Value freshness</p>
          <p style={{ marginTop: 0 }}>
            The Value cell has a left-border freshness indicator — green (&lt; 30 days), amber (30–90 days), or red (&gt; 90 days / never set).
            Click the <strong>↻</strong> button to confirm the value is current and reset the freshness timer to today.
          </p>

          <p style={h4Style}>Row actions</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>📌</strong> — pin the row; pin persists across sessions in your account profile.</li>
            <li><strong>📋</strong> — duplicate the row and open for editing.</li>
            <li><strong>🖨️</strong> — open the label preview and print an Avery 6427 label (CS-WX-XXXXXX + year/brand/type + QR code).</li>
            <li><strong>ℹ️</strong> — open the public wax view in a new tab (no login required).</li>
            <li><strong>✕</strong> — delete with confirmation.</li>
          </ul>

          <p style={h4Style}>Navigation &amp; sort</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Use the CD player controls (|◄ ▲ ▼ ►|) to jump through the list. Click <strong>⇅ Sort</strong>
            in the toolbar to configure a multi-level sort order and optionally save it as your default.
            Filter by year, brand, or type using the <strong>🔍</strong> column icons.
          </p>
        </div>

        {/* 11. Wax Packs */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>11. Wax Packs</h3>

          <p style={{ marginTop: 0 }}>
            The <Link to="/packs" style={{ color: "var(--link)" }}>Wax Packs</Link> page tracks individual wax packs
            as a first-class inventory type. Each item records the year, brand, pack type, quantity, value, and notes.
          </p>

          <p style={h4Style}>Adding &amp; editing</p>
          <ul style={{ marginTop: 0 }}>
            <li>Click <strong>＋</strong> in the header to add a new pack inline (year and brand required).</li>
            <li>Click <strong>✏️</strong> or any row to edit inline. Click ✓ to save or ✕ to cancel.</li>
            <li>The <strong>Type</strong> dropdown sets the pack type — <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Cello</span>, <span style={{ background: "#d97706", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Rack</span>, <span style={{ background: "#16a34a", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Wax</span>, or <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.8rem" }}>Blister</span>.</li>
          </ul>

          <p style={h4Style}>Value freshness</p>
          <p style={{ marginTop: 0 }}>
            The Value cell has a left-border freshness indicator — green (&lt; 30 days), amber (30–90 days), or red (&gt; 90 days / never set).
            Click the <strong>↻</strong> button to confirm the value is current and reset the freshness timer to today.
          </p>

          <p style={h4Style}>Row actions</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>📌</strong> — pin the row; pin persists across sessions in your account profile.</li>
            <li><strong>📋</strong> — duplicate the row and open for editing.</li>
            <li><strong>🖨️</strong> — open the label preview and print an Avery 6427 label (CS-PK-XXXXXX + year/brand/type + QR code).</li>
            <li><strong>ℹ️</strong> — open the public pack view in a new tab (no login required).</li>
            <li><strong>✕</strong> — delete with confirmation.</li>
          </ul>

          <p style={h4Style}>Navigation &amp; sort</p>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Use the CD player controls (|◄ ▲ ▼ ►|) to jump through the list. Click <strong>⇅ Sort</strong>
            in the toolbar to configure a multi-level sort order and optionally save it as your default.
            Filter by year, brand, or type using the <strong>🔍</strong> column icons.
          </p>
        </div>

        {/* 12. Analytics */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>12. Analytics</h3>

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

        {/* 13. Admin */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>13. Admin Settings</h3>

          <p style={{ marginTop: 0 }}>
            All administrative tools are consolidated on the <Link to="/admin" style={{ color: "var(--link)" }}>Admin</Link> page.
          </p>

          <p style={h4Style}>Feature toggles</p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Smart Fill</strong> — enable/disable dictionary-based auto-population</li>
            <li><strong>Image AI</strong> — enable/disable card image recognition (📷 Scan Card button); requires Anthropic API key</li>
            <li><strong>Collection Assistant</strong> — enable/disable the AI chatbot (Cy); aware of Cards, Balls, Wax Boxes, Wax Packs, and Sets/Binders (requires Anthropic API key)</li>
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

          <p style={h4Style}>Book freshness reset</p>
          <p style={{ marginTop: 0 }}>
            Click <strong>⏱️ Reset Book Value Timers</strong> to mark today as the book-value update date for
            every card that has book values entered. Use this after a bulk review session to establish a fresh
            baseline — rows will show as current (no amber or red border) until 30 or 90 days pass.
          </p>

          <p style={h4Style}>Row colours</p>
          <p style={{ marginTop: 0 }}>
            Customise the highlight colours for Mint cards, Rookie cards, and the Rookie + Mint combination
            using the colour pickers. Click <strong>Restore Defaults</strong> to reset to the original colours.
          </p>

          <p style={h4Style}>Set visibility</p>
          <p style={{ marginTop: 0 }}>
            Use the brand chip picker to select which sets appear on your Builds page.
            Deselect all chips in a brand to hide that brand's sets; select individual chips to show only specific sets.
          </p>

          <p style={h4Style}>Nav bar customization</p>
          <p style={{ marginTop: 0 }}>
            Use the Nav Items toggles to show or hide individual centre nav buttons (Add Card, My Cards, Analytics).
            Changes take effect immediately and persist across sessions.
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

        {/* 14. Account & Security */}
        <div style={sectionStyle}>
          <h3 style={h3Style}>14. Account &amp; Security</h3>

          <p style={{ marginTop: 0 }}>
            Access your account settings by clicking your username in the top-right of the navigation bar.
          </p>

          <p style={h4Style}>Last login</p>
          <p style={{ marginTop: 0 }}>
            Your most recent login date and time is displayed at the top of the Account page.
          </p>

          <p style={h4Style}>Change username or password</p>
          <ul style={{ marginTop: 0 }}>
            <li>Enter a new username and click <strong>Update Username</strong>.</li>
            <li>To change your password, enter your current password and your new password (twice). Password requirements: 8+ characters, uppercase, lowercase, number, and special character.</li>
          </ul>

          <p style={h4Style}>Multi-factor authentication (TOTP) <em style={{ fontWeight: 400, color: "var(--text-muted)" }}> — coming soon</em></p>
          <p style={{ marginTop: 0 }}>
            TOTP-based two-factor authentication (via apps like Google Authenticator or Authy) is planned for a future release.
          </p>

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

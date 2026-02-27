import React from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";

export default function ImportHelp() {
  return (
    <>
      <AppHeader />
      <div
        style={{
          maxWidth: "900px",
          margin: "2rem auto",
          padding: "0 1rem",
          lineHeight: "1.7",
        }}
      >
        <h2 className="page-header" style={{ textAlign: "center" }}>
          📥 Import Help
        </h2>

        <p>
          CardStoard supports importing multiple cards at once using a formatted
          CSV file. This guide explains the required format, valid values, and
          examples to ensure your imports run smoothly.
        </p>

        <p style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <Link
            to="/import-cards"
            className="nav-btn"
            style={{ display: "inline-block" }}
          >
            📤 Go to Import
          </Link>
        </p>

        <h3>✅ Required CSV Header (must be line 1)</h3>
        <pre
          style={{
            background: "#f4f6fa",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #ddd",
            overflowX: "auto",
            fontSize: "1rem"
          }}
        >
{`First,Last,Year,Brand,Rookie,Card Number,BookHi,BookHiMid,BookMid,BookLowMid,BookLow,Grade`}
        </pre>

        <h3>📄 Column Definitions</h3>
        <ul>
          <li><strong>First</strong> — Player first name</li>
          <li><strong>Last</strong> — Player last name</li>
          <li><strong>Year</strong> — Card year (numeric)</li>
          <li><strong>Brand</strong> — Card manufacturer (Topps, Bowman, etc.)</li>
          <li><strong>Rookie</strong> — TRUE | FALSE | 1 | 0 | * (or blank)</li>
          <li><strong>Card Number</strong> — The printed card number</li>
          <li><strong>BookHi</strong> — high book value</li>
          <li><strong>BookHiMid</strong> — high-mid book value</li>
          <li><strong>BookMid</strong> — mid book value</li>
          <li><strong>BookLowMid</strong> — low-mid book value</li>
          <li><strong>BookLow</strong> — low book value</li>
          <li>
            <strong>Grade</strong> — Raw grade. Valid values:
            <ul style={{ marginTop: "0.5rem" }}>
              <li>3.0 (NM-MT+)</li>
              <li>1.5 (NM)</li>
              <li>1.0 (EX)</li>
              <li>0.8 (VG)</li>
              <li>0.4 (G)</li>
              <li>0.2 (P)</li>
            </ul>
          </li>
        </ul>

        <h3>⚠ Important Rules</h3>
        <ul>
          <li>Header row MUST be included.</li>
          <li>All 12 columns must be present — column order does not matter.</li>
          <li>
            Headers are <strong>case-sensitive</strong> and must match exactly as shown above
            (e.g. <code>BookHi</code> not <code>bookhi</code> or <code>BOOKHI</code>).
          </li>
          <li>
            Rookie supports: <strong>TRUE, FALSE, Yes, No, *, 1, 0</strong> or blank.
          </li>
          <li>
            All Book value columns must be numeric (no $ signs, commas, or text).
          </li>
          <li>No images are handled via CSV — images are uploaded separately.</li>
        </ul>

        <h3>🔍 Pre-Import Validation</h3>
        <p>
          Use the <strong>Validate File</strong> button on the{" "}
          <Link to="/import-cards" style={{ color: "#0066cc", textDecoration: "underline" }}>
            Import page
          </Link>{" "}
          to check your file before importing. Validation runs three checks in order:
        </p>
        <ol>
          <li><strong>File type</strong> — must be a <code>.csv</code> file.</li>
          <li>
            <strong>Headers</strong> — all 12 required column headers must be present
            (case-sensitive). Any missing headers are listed by name.
          </li>
          <li>
            <strong>Grade per row</strong> — each row is checked for a valid grade value.
            Errors include the row number and player name so you can find and fix them quickly.
          </li>
        </ol>
        <p>
          Blank First, Last, Year, or Brand fields will generate warnings but will not
          block the import — those rows will be imported with empty values.
        </p>

        <h3>📌 Example Valid CSV</h3>

        <pre
          style={{
            background: "#f4f6fa",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #ddd",
            overflowX: "auto",
            fontSize: "1rem",
          }}
        >
{`First,Last,Year,Brand,Rookie,Card Number,BookHi,BookHiMid,BookMid,BookLowMid,BookLow,Grade
Ken,Griffey Jr,1989,Upper Deck,*,1,150,120,100,70,50,3.0
Mike,Trout,2018,Topps,FALSE,27,15,12,10,7,5,1.0
Nolan,Ryan,1984,Topps,,470,20,18,15,12,8,0.8`}
        </pre>

        <p style={{ marginTop: "2rem" }}>
          If your CSV fails to import, use Validate File to identify errors before uploading.
          For help, contact <strong>cardstoard@gmail.com</strong>.
        </p>

        <p style={{ textAlign: "center", fontSize: "0.9rem", marginTop: "3rem" }}>
          © CardStoard {new Date().getFullYear()}
        </p>
      </div>
    </>
  );
}

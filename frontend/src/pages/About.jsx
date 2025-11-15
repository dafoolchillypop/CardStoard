import React from "react";
import AppHeader from "../components/AppHeader";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <>
      <AppHeader />

      <div
        style={{
          maxWidth: "800px",
          margin: "2rem auto",
          padding: "0 1rem",
          textAlign: "left",
          lineHeight: "1.6",
        }}
      >
        <h2 className="page-header" style={{ textAlign: "center" }}>
          📘 About CardStoard
        </h2>

        <p>
          <strong>CardStoard</strong> is a personal web application built for
          collectors who want a fast, simple, and powerful way to manage and
          value their baseball card collections.
        </p>

        <h3>🎯 Purpose</h3>
        <p>
          CardStoard helps you catalog baseball cards, track values,
          visualize trends, and maintain a clean digital inventory of your
          collection. It was built with speed, accuracy, and simplicity in mind
          — optimized for collectors, by a collector.
        </p>

        <h3>🧩 Core Features</h3>
        <ul>
          <li>Inventory management with images (front & back)</li>

          {/* 🔗 Updated line — only change requested */}
          <li>
            Manual and CSV card{" "}
            <Link
              to="/import-help"
              style={{ color: "#167e30", fontWeight: "bold" }}
            >
              import
            </Link>
          </li>

          <li>Fuzzy valuation system for raw (non-graded) cards</li>
          <li>Email verification, login, and secure session handling</li>
          <li>Admin settings + collection analytics</li>
        </ul>

        <h3>📦 Current Version</h3>
        <p>
          <strong>CardStoard v1.0</strong>
        </p>

        <h3>📜 Disclaimer</h3>
        <p>
          CardStoard is a personal project and is not affiliated with or
          endorsed by any sports or grading organizations. All card images and
          valuations are user-generated or based on public market data.
        </p>

        <h3>📩 Contact</h3>
        <p>
          Feedback or issues?  
          Email: <strong>cardstoard@gmail.com</strong>
        </p>

        <p
          style={{
            marginTop: "2rem",
            textAlign: "center",
            fontSize: "0.9rem",
          }}
        >
          © CardStoard {new Date().getFullYear()} — All rights reserved.
        </p>
      </div>
    </>
  );
}

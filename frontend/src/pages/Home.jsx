import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Card Stoard Collectors System</h1>
      <div style={{ marginTop: "20px" }}>
        <Link to="/cards">
          <button style={{ marginRight: "10px" }}>List Cards</button>
        </Link>
        <Link to="/add-card">
          <button>Add Card</button>
        </Link>
      </div>
    </div>
  );
}

export default Home;

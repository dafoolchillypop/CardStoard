import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function ListCards() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    axios
      .get("http://host.docker.internal:8000/cards/")
      .then((response) => {
        setCards(response.data);
      })
      .catch((error) => {
        console.error("Error fetching cards:", error);
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: "#003366" }}>List of Cards</h2>
      <table border="1" cellPadding="10" style={{ backgroundColor: "#fff" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Player</th>
            <th>Year</th>
            <th>Brand</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td>{card.id}</td>
              <td>{card.player}</td>
              <td>{card.year}</td>
              <td>{card.brand}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
      <Link to="/">⬅ Back to Home</Link>
    </div>
  );
}

export default ListCards;

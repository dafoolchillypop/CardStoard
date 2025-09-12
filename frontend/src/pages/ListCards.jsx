import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ListCards() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    axios.get("http://host.docker.internal:8000/cards/")
      .then(res => setCards(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="container">
      <Link className="nav-btn" to="/">Back to Home</Link>
      <h2>Card List</h2>

      {cards.length === 0 ? (
        <p>No cards found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>First</th>
              <th>Last</th>
              <th>Year</th>
              <th>Brand</th>
              <th>#</th>
              <th>Rookie</th>
              <th>Grade</th>
              <th>Book</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <tr key={card.id}>
                <td>{card.first_name}</td>
                <td>{card.last_name}</td>
                <td>{card.year}</td>
                <td>
                  {card.brand && (
                    <span className="badge badge-brand">{card.brand}</span>
                  )}
                </td>
                <td>{card.card_number}</td>
                <td>{card.rookie === 1 ? "Yes" : "No"}</td>
                <td>
                  {card.grade && (
                    <span className="badge badge-grade">{card.grade}</span>
                  )}
                </td>
                <td>
                  {card.value_high}|{card.value_high_mid}|{card.value_mid}|{card.value_low_mid}|{card.value_low}
                </td>
                <td>
                  <Link to={`/update-card/${card.id}`} className="nav-btn">Update</Link>{" "}
                  <Link to={`/delete-card/${card.id}`} className="nav-btn">Delete</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

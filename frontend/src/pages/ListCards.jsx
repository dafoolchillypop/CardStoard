import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ListCards() {
  const [cards, setCards] = useState([]);

  const fetchCards = () => {
    axios.get("http://host.docker.internal:8000/cards/")
      .then((res) => setCards(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchCards(); }, []);

  const deleteCard = (id) => {
    if (!window.confirm("Delete this card? This cannot be undone.")) return;
    axios.delete(`http://host.docker.internal:8000/cards/${id}`)
      .then(() => {
        fetchCards();
        alert("Card deleted.");
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="container">
      <Link className="nav-btn" to="/">Back to Home</Link>
      <Link className="nav-btn" to="/add">Add Card</Link>
      <h2>Card Collection</h2>
      {cards.length === 0 ? (
        <p>No cards in inventory.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>First</th>
              <th>Last</th>
              <th>Year</th>
              <th>Brand</th>
              <th>Card #</th>
              <th>Rookie</th>
              <th>Grade</th>
              <th>High</th>
              <th>HighMid</th>
              <th>Mid</th>
              <th>LowMid</th>
              <th>Low</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.first_name}</td>
                <td>{c.last_name}</td>
                <td>{c.year}</td>
                <td>{c.brand}</td>
                <td>{c.card_number}</td>
                <td>{c.rookie ? "Yes" : "No"}</td>
                <td>{c.grade}</td>
                <td>{c.value_high}</td>
                <td>{c.value_high_mid}</td>
                <td>{c.value_mid}</td>
                <td>{c.value_low_mid}</td>
                <td>{c.value_low}</td>
                <td>
                  <button onClick={() => deleteCard(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

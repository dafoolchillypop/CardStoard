import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ListCards() {
  const [cards, setCards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    player_name: "",
    team: "",
    year: "",
    brand: "",
    rookie: false,
  });

  const fetchCards = () => {
    axios.get("http://host.docker.internal:8000/cards/")
      .then((res) => setCards(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchCards(); }, []);

  const startEdit = (card) => {
    setEditingId(card.id);
    setEditForm({
      player_name: card.player_name || "",
      team: card.team || "",
      year: card.year || "",
      brand: card.brand || "",
      rookie: !!card.rookie,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === "checkbox" ? checked : value });
  };

  const saveEdit = (id) => {
    axios.put(`http://host.docker.internal:8000/cards/${id}`, editForm)
      .then(() => { setEditingId(null); fetchCards(); })
      .catch((err) => console.error(err));
  };

  const deleteCard = (id) => {
    axios.delete(`http://host.docker.internal:8000/cards/${id}`)
      .then(() => fetchCards())
      .catch((err) => console.error(err));
  };

  return (
    <div className="container">
      <div style={{ marginBottom: "10px" }}>
        <Link className="nav-btn" to="/">Back to Home</Link>
        <Link className="nav-btn" to="/add">Add Card</Link>
      </div>

      <h2>Card Collection</h2>
      {cards.length === 0 ? (
        <p>No cards in inventory.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Player</th>
              <th>Team</th>
              <th>Year</th>
              <th>Brand</th>
              <th>Rookie</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id}>
                <td>{card.id}</td>
                <td>
                  {editingId === card.id ? (
                    <input name="player_name" value={editForm.player_name} onChange={handleChange} />
                  ) : (
                    card.player_name
                  )}
                </td>
                <td>
                  {editingId === card.id ? (
                    <input name="team" value={editForm.team} onChange={handleChange} />
                  ) : (
                    card.team
                  )}
                </td>
                <td>
                  {editingId === card.id ? (
                    <input type="number" name="year" value={editForm.year} onChange={handleChange} />
                  ) : (
                    card.year
                  )}
                </td>
                <td>
                  {editingId === card.id ? (
                    <input name="brand" value={editForm.brand} onChange={handleChange} />
                  ) : (
                    card.brand
                  )}
                </td>
                <td>
                  {editingId === card.id ? (
                    <input type="checkbox" name="rookie" checked={editForm.rookie} onChange={handleChange} />
                  ) : (
                    card.rookie ? "Yes" : "No"
                  )}
                </td>
                <td>
                  {editingId === card.id ? (
                    <div className="actions">
                      <button onClick={() => saveEdit(card.id)}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="actions">
                      <button onClick={() => startEdit(card)}>Edit</button>
                      <button onClick={() => deleteCard(card.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

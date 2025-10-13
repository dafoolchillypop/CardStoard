import React, { useEffect, useState } from "react";
import api from "../api/api";

function CardList() {
  const [cards, setCards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    player_name: "",
    team: "",
    year: "",
    brand: "",
    rookie: false,
  });

  // Load all cards
  const fetchCards = () => {
    api
      .get("/cards/")
      .then((res) => setCards(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // Delete a card
  const deleteCard = (id) => {
    api
      .delete(`/cards/${id}`)
      .then(() => fetchCards())
      .catch((err) => console.error(err));
  };

  // Start editing a card
  const startEdit = (card) => {
    setEditingId(card.id);
    setEditForm({
      player_name: card.player_name,
      team: card.team,
      year: card.year,
      brand: card.brand,
      rookie: card.rookie,
    });
  };

  // Handle edit form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Submit edit
  const saveEdit = (id) => {
    api
      .put(`/cards/${id}`, editForm)
      .then(() => {
        setEditingId(null);
        fetchCards();
      })
      .catch((err) => console.error(err));
  };

  return (
    <div>
      <h2>Card Collection</h2>
      {cards.length === 0 ? (
        <p>No cards in inventory.</p>
      ) : (
        <ul>
          {cards.map((card) => (
            <li key={card.id}>
              {editingId === card.id ? (
                <div>
                  <input
                    type="text"
                    name="player_name"
                    value={editForm.player_name}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    name="team"
                    value={editForm.team}
                    onChange={handleChange}
                  />
                  <input
                    type="number"
                    name="year"
                    value={editForm.year}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    name="brand"
                    value={editForm.brand}
                    onChange={handleChange}
                  />
                  <label>
                    Rookie:
                    <input
                      type="checkbox"
                      name="rookie"
                      checked={editForm.rookie}
                      onChange={handleChange}
                    />
                  </label>
                  <button onClick={() => saveEdit(card.id)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div>
                  {card.year} {card.brand} - {card.player_name} ({card.team}){" "}
                  {card.rookie ? "⭐ Rookie" : ""}
                  <button onClick={() => startEdit(card)}>Edit</button>
                  <button onClick={() => deleteCard(card.id)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CardList;

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
        <div className="card-section">
          <table>
            <thead>
              <tr>
                <th>First</th>
                <th>Last</th>
                <th>Year</th>
                <th>Brand</th>
                <th>#</th>
                <th className="rookie-col">Rookie</th>
                <th className="grade-col">Grade</th>
                <th className="book-col">Book</th>
                <th className="action-col">Actions</th>
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
                  <td>{card.card_number}
                  </td>

                  {/* ✅ Rookie centered */}
                  <td className="rookie-col">
                    {Number(card.rookie) === 1 && (
                      <span className="rookie-badge">⭐</span>
                    )}
                  </td>

                  {/* ✅ Grade centered */}
                  <td className="grade-col">
                    {card.grade && (() => {
                      const g = parseFloat(card.grade);
                      let gradeClass = "grade-unknown";

                      if (!isNaN(g)) {
                        if (g === 3) gradeClass = "grade-mt";
                        else if (g === 1.5) gradeClass = "grade-ex";
                        else if (g === 1) gradeClass = "grade-vg";
                        else if (g === 0.8) gradeClass = "grade-gd";
                        else if (g === 0.4) gradeClass = "grade-fr";
                        else gradeClass = "grade-pr";
                      }

                    return (
                      <span className={`badge badge-grade ${gradeClass}`}>
                        {card.grade}
                      </span>);})()}
                  </td>

                    {/* ✅ Book badges centered */}
                    <td className="book-col">
                      {card.book_high && (<span className="book-badge book-high">{card.book_high}</span>)}
                      {card.book_high_mid && (<span className="book-badge book-highmid">{card.book_high_mid}</span>)}
                      {card.book_mid && (<span className="book-badge book-mid">{card.book_mid}</span>)}
                      {card.book_low_mid && (<span className="book-badge book-lowmid">{card.book_low_mid}</span>)}
                      {card.book_low && (<span className="book-badge book-low">{card.book_low}</span>)}
                    </td>

                    {/* ✅ Actions centered */}
                    <td className="actions-col">
                      <Link to={`/update-card/${card.id}`} className="nav-btn">Update</Link>{" "}
                      <Link to={`/delete-card/${card.id}`} className="nav-btn">Delete</Link>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

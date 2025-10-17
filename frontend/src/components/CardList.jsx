import React, { useEffect, useState } from 'react';
import api from '../api/api';

const CardList = () => {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    api.get('/cards/').then(res => setCards(res.data));
  }, []);

  return (
    <div>
      <h2>Baseball Cards</h2>
      <ul>
        {cards.map(card => (
          <li key={card.id}>{card.player_name} - {card.team} ({card.year})</li>
        ))}
      </ul>
    </div>
  );
};

export default CardList;
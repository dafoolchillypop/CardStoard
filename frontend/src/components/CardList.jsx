import React, { useEffect, useState } from 'react';
import { getCards } from '../services/api';

function CardList() {
  const [cards, setCards] = useState([]);
  useEffect(() => {
    getCards().then(setCards);
  }, []);
  return (
    <div>
      <h2>Cards</h2>
      <ul>
        {cards.map(card => (
          <li key={card.id}>{card.year} - {card.player}</li>
        ))}
      </ul>
    </div>
  );
}
export default CardList;

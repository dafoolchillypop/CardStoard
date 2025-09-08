import React, { useState } from 'react';
import api from '../api/api';

const CardForm = () => {
  const [playerName, setPlayerName] = useState('');
  const [year, setYear] = useState('');
  const [team, setTeam] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/cards/', { player_name: playerName, year: parseInt(year), team });
    setPlayerName('');
    setYear('');
    setTeam('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Player Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
      <input placeholder="Year" value={year} onChange={e => setYear(e.target.value)} />
      <input placeholder="Team" value={team} onChange={e => setTeam(e.target.value)} />
      <button type="submit">Add Card</button>
    </form>
  );
};

export default CardForm;
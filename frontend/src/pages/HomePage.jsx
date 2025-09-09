import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div>
      <h1>Baseball Card App</h1>
      <nav>
        <Link to="/add">Add Card</Link>
        <Link to="/list">List Cards</Link>
        <Link to="/update">Update Card</Link>
        <Link to="/delete">Delete Card</Link>
      </nav>
    </div>
  );
}

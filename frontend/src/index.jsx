import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './index.css';
import HomePage from './pages/HomePage';
import AddCard from './pages/AddCard';
import ListCards from './pages/ListCards';
import UpdateCard from './pages/UpdateCard';
import DeleteCard from './pages/DeleteCard';

ReactDOM.render(
  <Router>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add" element={<AddCard />} />
      <Route path="/list" element={<ListCards />} />
      <Route path="/update" element={<UpdateCard />} />
      <Route path="/delete" element={<DeleteCard />} />
    </Routes>
  </Router>,
  document.getElementById('root')
);

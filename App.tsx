import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Scan } from './pages/Scan';
import { Studio } from './pages/Studio';
import { History } from './pages/History';
import { NavBar } from './components/NavBar';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<><Landing /><NavBar /></>} />
        <Route path="/scan" element={<><Scan /><NavBar /></>} />
        <Route path="/history" element={<><History /><NavBar /></>} />
        <Route path="/studio/:id" element={<Studio />} />
      </Routes>
    </Router>
  );
};

export default App;

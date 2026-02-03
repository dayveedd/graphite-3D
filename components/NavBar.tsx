import React from 'react';
import { Box, FileClock, Scan } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const NavBar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white/90 backdrop-blur-md border-t md:border-b border-slate-200 z-50 h-16 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
        <Box className="w-6 h-6 text-blue-600" />
        <span>GRAPHITE</span>
      </Link>
      
      <div className="flex gap-6">
        <Link to="/scan" className={`flex flex-col md:flex-row items-center gap-1 ${isActive('/scan') ? 'text-blue-600' : 'text-slate-500'}`}>
          <Scan className="w-5 h-5" />
          <span className="text-xs md:text-sm font-medium">Scan</span>
        </Link>
        <Link to="/history" className={`flex flex-col md:flex-row items-center gap-1 ${isActive('/history') ? 'text-blue-600' : 'text-slate-500'}`}>
          <FileClock className="w-5 h-5" />
          <span className="text-xs md:text-sm font-medium">History</span>
        </Link>
      </div>
    </nav>
  );
};

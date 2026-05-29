'use client';
import React, { useState } from 'react';
import '@/styles/receptionist/search-bar.css';

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="search-container">
      <span className="search-icon-btn" onClick={() => setIsOpen(!isOpen)}>🔍</span>
      {isOpen && (
        <div className="search-dropdown">
          <input type="text" placeholder="Search..." autoFocus />
        </div>
      )}
    </div>
  );
};

export default SearchBar;

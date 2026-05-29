'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MEDICAL_CONDITIONS } from '@/data/patient/constants';
import '@/styles/patient/medical-condition-selector.css';

const MedicalConditionSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState(MEDICAL_CONDITIONS);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    setFiltered(MEDICAL_CONDITIONS.filter((c) => c.toLowerCase().includes(v.toLowerCase())));
    setShowSuggestions(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="form-group responsive-dropdown" ref={dropdownRef}>
      <label htmlFor="medicalCondition">Medical Condition <span className="required">*</span></label>
      <input
        type="text"
        id="medicalCondition"
        value={value}
        onChange={handleInputChange}
        className="selector-dropdown"
        placeholder="Select or type a condition"
        autoComplete="off"
        ref={inputRef}
        required
      />
      {showSuggestions && filtered.length > 0 && (
        <ul className="suggestions-dropdown">
          {filtered.map((condition, i) => (
            <li key={i} onClick={() => { onChange(condition); setShowSuggestions(false); }} className="suggestion-item">
              {condition}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MedicalConditionSelector;

'use client';
import React from 'react';
import { FaUserAlt, FaMedal } from 'react-icons/fa';
import '@/styles/patient/exp-qual.css';

const ExpQual = ({ expQualification }: { expQualification: { exp: string; qualification: string } }) => (
  <div className="experience-qualification">
    <div className="info-item">
      <FaUserAlt className="icon" />
      <span>{expQualification.exp} of Experience</span>
    </div>
    <div className="info-item">
      <FaMedal className="icon" />
      <span>{expQualification.qualification}</span>
    </div>
  </div>
);

export default ExpQual;

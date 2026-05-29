'use client';
import React from 'react';
import Link from 'next/link';

const AvailabilityCard = () => (
  <div className="availability-container">
    <h1>Available Doctors</h1>
    <div className="action-buttons">
      <Link href="/receptionist/doctors">
        <button className="outline-btn">View Availability</button>
      </Link>
    </div>
  </div>
);

export default AvailabilityCard;

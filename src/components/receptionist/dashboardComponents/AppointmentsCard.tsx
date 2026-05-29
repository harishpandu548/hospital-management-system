'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/styles/receptionist/appointments-card.css';

const AppointmentsCard = () => {
  const router = useRouter();
  return (
    <div className="appointments-container">
      <h1>Manage Appointments</h1>
      <div className="action-buttons">
        <Link href="/receptionist/appointments">
          <button type="button" className="outline-btn">View All Appointments</button>
        </Link>
        <Link href="/receptionist/book-appointment">
          <button type="button" className="solid-btn">Create Appointment</button>
        </Link>
      </div>
      <div className="filter-buttons">
        <button type="button" className="filter-btn" onClick={() => router.push('/receptionist/appointments?filter=today')}>Today</button>
        <button type="button" className="filter-btn" onClick={() => router.push('/receptionist/appointments?filter=week')}>This Week</button>
        <button type="button" className="filter-btn" onClick={() => router.push('/receptionist/appointments?filter=upcoming')}>Upcoming</button>
      </div>
    </div>
  );
};

export default AppointmentsCard;

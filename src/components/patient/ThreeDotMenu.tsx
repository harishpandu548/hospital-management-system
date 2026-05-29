'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctors } from '@/context/patient/DoctorsContext';
import '@/styles/patient/three-dot-menu.css';

const ThreeDotMenu = ({ doctorId }: { doctorId: string | number }) => {
  const { doctorsData } = useDoctors();
  const doctor = doctorsData.find((d: any) => String(d.id) === String(doctorId));
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!doctor) return null;

  return (
    <div className="three-dot-container" ref={menuRef}>
      <button className="three-dot-btn" onClick={() => setOpen(!open)}>⋮</button>
      {open && (
        <div className="three-dot-menu">
          <p><strong>{doctor.name}</strong></p>
          <p>Specialty: {doctor.speciality}</p>
          <p>Experience: {doctor.experience}</p>
          <hr />
          <button onClick={() => router.push(`/doctors/${doctor.id}`)}>View Profile</button>
        </div>
      )}
    </div>
  );
};

export default ThreeDotMenu;

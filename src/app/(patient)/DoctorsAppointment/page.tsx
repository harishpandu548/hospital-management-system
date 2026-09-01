'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaSearch } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import AppointmentModal from '@/components/patient/AppointmentModal';
import ThreeDotMenu from '@/components/patient/ThreeDotMenu';
import { useDoctors } from '@/context/patient/DoctorsContext';
import { SPECIALTY_COLORS } from '@/data/patient/constants';
import { staggerContainer, fadeUp, scaleUp, pageVariants } from '@/lib/animations';
import { io } from 'socket.io-client';
import '@/styles/patient/doctors-appointment.css';

const DoctorsAppointmentPage = () => {
  const { doctorsData, loading, fetchError, refetch } = useDoctors();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { refetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [selectedDoctor, setSelectedDoctor]   = useState<any>(null);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [searchTerm, setSearchTerm]           = useState('');
  const [availableDoctorIds, setAvailableDoctorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch initial availability
    const token = typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null;
    fetch('/api/doctors/availability-status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { availableIds: [] })
      .then(d => setAvailableDoctorIds(new Set(d.availableIds || [])))
      .catch(() => {});

    // Listen to real-time status updates
    const socket = io('http://localhost:3001');
    socket.on('doctor-status-changed', (data: { doctorId: string, available: boolean }) => {
      setAvailableDoctorIds(prev => {
        const next = new Set(prev);
        if (data.available) next.add(data.doctorId);
        else next.delete(data.doctorId);
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  const specialities     = ['All', ...new Set(doctorsData.map((d: any) => d.speciality))];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDoctors  = doctorsData
    .filter((d: any) => activeSpecialty === 'All' || d.speciality === activeSpecialty)
    .filter((d: any) => !normalizedSearch || d.name.toLowerCase().includes(normalizedSearch) || d.speciality.toLowerCase().includes(normalizedSearch));

  const scrollLeft  = () => scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => scrollContainerRef.current?.scrollBy({ left:  200, behavior: 'smooth' });

  if (loading) return (
    <div className="doctors-appointment">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="appointment-container">
        <motion.header className="appointment-header" initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
          <p className="book-text">Book an Appointment with</p>
          <h1 className="our-doctors">Our Doctors</h1>
        </motion.header>
        <motion.div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20, padding:'20px 0' }}
          variants={staggerContainer} initial="initial" animate="animate">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i} variants={fadeUp} style={{ background:'#fff', borderRadius:16, padding:'24px 20px', border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
              <div style={{ width:'70%', height:14, borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
              <div style={{ width:'55%', height:11, borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
              <div style={{ width:'100%', height:36, borderRadius:10, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="doctors-appointment">
      <motion.div className="appointment-container" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'3rem' }}>
        <motion.p initial={{ scale:0.8 }} animate={{ scale:1 }} transition={{ type:'spring' }} style={{ color:'#dc2626', fontSize:15, marginBottom:16 }}>{fetchError}</motion.p>
        <Link href="/login" style={{ color:'#6366f1', fontWeight:600 }}>Go to Login →</Link>
      </motion.div>
    </div>
  );

  return (
    <motion.div className="doctors-appointment" variants={pageVariants} initial="initial" animate="animate">
      <div className="appointment-container">
        <motion.header className="appointment-header" initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}>
          <motion.p className="book-text" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}>Book an Appointment with</motion.p>
          <motion.h1 className="our-doctors" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18, duration:0.5 }}>Our Doctors</motion.h1>
        </motion.header>

        {/* Specialty filter */}
        <motion.div className="scrollable-menu-container" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22, duration:0.45 }}>
          <div className="menu-wrapper">
            <motion.button className="scroll-btn left" onClick={scrollLeft} whileHover={{ scale:1.15 }} whileTap={{ scale:0.9 }}>&#8249;</motion.button>
            <div className="tabs-container" ref={scrollContainerRef}>
              <nav className="specialty-nav">
                {specialities.map((s, i) => (
                  <motion.button
                    key={s}
                    className={`specialty-btn ${activeSpecialty === s ? 'active' : ''}`}
                    onClick={() => setActiveSpecialty(s as string)}
                    initial={{ opacity:0, y:8 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y:-2 }}
                    whileTap={{ scale:0.95 }}
                  >{s}</motion.button>
                ))}
              </nav>
            </div>
            <motion.button className="scroll-btn right" onClick={scrollRight} whileHover={{ scale:1.15 }} whileTap={{ scale:0.9 }}>&#8250;</motion.button>
          </div>
        </motion.div>

        {/* Search bar */}
        <motion.div className="search-bar-container" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.28 }}>
          <motion.div className="search-input-wrapper" whileFocusWithin={{ scale:1.01 }}>
            <input
              type="text"
              className="search-bar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search doctor, specialty"
            />
            <FaSearch className="search-icon" />
          </motion.div>
        </motion.div>

        {/* Doctor cards */}
        <AnimatePresence mode="wait">
          {filteredDoctors.length === 0 ? (
            <motion.p key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ textAlign:'center', color:'#94a3b8', padding:'2rem' }}>
              No doctors match your search.
            </motion.p>
          ) : (
            <motion.div key="grid" className="doctors-grid" variants={staggerContainer} initial="initial" animate="animate">
              {filteredDoctors.map((doctor: any, i: number) => (
                <motion.div
                  key={doctor.id}
                  className="doctor-card hover-lift"
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y:-5, boxShadow:'0 12px 32px rgba(99,102,241,0.14)', transition:{ duration:0.22 } }}
                  layout
                >
                  <div className="card-header" style={{ display:'flex', alignItems:'center', justifyContent:'right' }}>
                    <ThreeDotMenu doctorId={doctor.id} />
                  </div>
                  <motion.div className="doctor-card-avatar" whileHover={{ scale:1.08 }} transition={{ type:'spring', stiffness:400, damping:20 }}>
                    <div className="avatar-placeholder">
                      <svg width="45" height="45" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="16" r="6" fill="grey" />
                        <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="grey" />
                      </svg>
                    </div>
                  </motion.div>
                  <h3 className="doctor-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {doctor.name}
                    {availableDoctorIds.has(doctor.id) && (
                      <span style={{ fontSize: 11, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfdf5', padding: '2px 8px', borderRadius: 12, border: '1px solid #a7f3d0' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
                        Live
                      </span>
                    )}
                  </h3>
                  <div className="doctor-info">
                    <p className="doctor-detail">Experience: {doctor.experience}</p>
                    <p className="doctor-detail">Qualification: {doctor.qualification}</p>
                  </div>
                  <motion.div
                    className="specialty-tag"
                    style={{ backgroundColor: SPECIALTY_COLORS[doctor.speciality] || '#6b7280' }}
                    whileHover={{ scale:1.05 }}
                  >
                    {doctor.speciality}
                  </motion.div>
                  <motion.button
                    className="book-appointment-btn ripple-btn"
                    onClick={() => { setSelectedDoctor(doctor); setIsModalOpen(true); }}
                    whileHover={{ scale:1.03 }}
                    whileTap={{ scale:0.96 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    Book Appointment
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isModalOpen && selectedDoctor && (
            <AppointmentModal doctor={selectedDoctor} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>

        <motion.div className="navigation-buttons" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}>
          <motion.div whileHover={{ x:-4 }} whileTap={{ scale:0.96 }}>
            <Link href="/home" className="-btn back-btn">BACK</Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DoctorsAppointmentPage;

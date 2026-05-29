'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp } from '@/lib/animations';
import { usePatients } from '@/context/receptionist/PatientsContext';
import PatientModal from '@/components/receptionist/PatientModal';
import '@/styles/receptionist/patients.css';

const SkeletonRow = () => (
  <tr>
    {[80,100,40,90,80,80,50].map((w,i)=>(
      <td key={i}><div style={{height:13,width:w,borderRadius:4,background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite'}}/></td>
    ))}
  </tr>
);

const PatientsPage = () => {
  const router = useRouter();
  const { patientsData, loading } = usePatients();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<any>(null);
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredRowId, setHoveredRowId] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('.dropdown-container')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = search.trim().toLowerCase();
  const filteredPatients = q
    ? patientsData.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.doctor?.toLowerCase().includes(q) ||
        p.condition?.toLowerCase().includes(q) ||
        p.contact?.toLowerCase().includes(q)
      )
    : patientsData;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div className="patient-container">
      <div className="patient-header">
        <motion.h2
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Patient Details
        </motion.h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button
            className="add-btn"
            onClick={() => router.push('/receptionist/add-patient')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            Add Patient
          </motion.button>
          <motion.button
            className="add-btn create-appointment-btn"
            onClick={() => router.push('/receptionist/book-appointment')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            Book Appointment
          </motion.button>
        </div>
      </div>
      <div className="patient-filters">
        <motion.input
          type="text"
          placeholder="Search by name, doctor, condition…"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        />
      </div>
      <div className="patient-table-wrapper">
        <table className="patient-table">
          <thead>
            <tr>
              <th>#</th><th>Patient Name</th><th>Age</th><th>Doctor</th><th>Condition</th><th>Contact</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4,5].map(k=><SkeletonRow key={k}/>)}
            {!loading && filteredPatients.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{patientsData.length === 0 ? 'No patients yet.' : 'No results match your search.'}</td></tr>
            )}
            {!loading && filteredPatients.map((p: any, index: number) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={hoveredRowId === (p.patientId || p.id) ? 'row-highlighted' : ''}
              >
                <td style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem' }}>#{String(index + 1).padStart(3, '0')}</td>
                <td
                  onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTooltipData(p); setTooltipPos({ x: r.right + 10, y: r.top }); setHoveredRowId(p.patientId || p.id); }}
                  onMouseLeave={() => { setTooltipData(null); setHoveredRowId(null); }}
                  style={{ cursor: 'pointer' }}
                  className="patient-name-cell"
                >
                  <span className="patient-name-hover">{p.name}</span>
                </td>
                <td>{p.age}</td>
                <td>{p.doctor}</td>
                <td>{p.condition}</td>
                <td>{p.contact}</td>
                <td className="dropdown-container" style={{ position: 'relative' }}>
                  <button className="patient-action-btn" onClick={() => setOpenDropdownId(openDropdownId === (p.patientId || p.id) ? null : (p.patientId || p.id))}>⋮</button>
                  {openDropdownId === (p.patientId || p.id) && (
                    <div className="dropdown-menu">
                      <button onClick={() => { setSelectedPatient(p); setShowModal(true); setOpenDropdownId(null); }}>View Details</button>
                      <button onClick={() => setOpenDropdownId(null)}>Check Reports</button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltipData && (
        <div className="patient-tooltip" style={{ position: 'fixed', left: Math.max(10, Math.min(tooltipPos.x, 1200)), top: Math.max(50, tooltipPos.y), minWidth: '280px', maxWidth: '350px' }}>
          <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}><strong>{tooltipData.name}</strong></div>
          <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.6' }}>
            <div><strong>Age:</strong> {tooltipData.age}</div>
            <div><strong>Doctor:</strong> {tooltipData.doctor}</div>
            <div><strong>Condition:</strong> {tooltipData.condition}</div>
            <div><strong>Contact:</strong> {tooltipData.contact}</div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <PatientModal patient={selectedPatient} onClose={() => { setShowModal(false); setSelectedPatient(null); }} />
        )}
      </AnimatePresence>
    </div>
    </motion.div>
  );
};

export default PatientsPage;

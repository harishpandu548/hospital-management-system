'use client';
import React, { useState, useEffect } from 'react';
import { useDoctors } from '@/context/receptionist/DoctorsContext';
import DoctorAddModal from '@/components/receptionist/DoctorAddModal';
import DoctorEditModal from '@/components/receptionist/DoctorEditModal';
import DoctorViewModal from '@/components/receptionist/DoctorViewModal';
import '@/styles/receptionist/doctors.css';

const SkeletonRow = () => (
  <tr>
    {[70,100,80,70,80,60,50].map((w,i)=>(
      <td key={i}><div style={{height:13,width:w,borderRadius:4,background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite'}}/></td>
    ))}
  </tr>
);

const DoctorsPage = () => {
  const { doctorsData, setDoctorsData, refetch, loading } = useDoctors();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewDoctor, setViewDoctor] = useState<any>(null);
  const [openDropdownId, setOpenDropdownId] = useState<any>(null);
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredRowId, setHoveredRowId] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const q = search.trim().toLowerCase();
  const filteredDoctors = doctorsData.filter((d: any) => {
    const matchesSearch = !q || d.name?.toLowerCase().includes(q) || d.speciality?.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || d.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('.dropdown-container')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // After doctor added via API, refetch from server
  const handleAddDoctor = () => {
    refetch?.();
  };

  const handleUpdateDoctor = (updatedDoctor: any) => {
    setDoctorsData((prev: any[]) => prev.map((d: any) => (d.id === updatedDoctor.id ? updatedDoctor : d)));
    setSelectedDoctor(null);
    setIsEditModalOpen(false);
  };

  return (
    <>
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div className="doctor-container">
      <div className="doctor-header">
        <h2>Doctor Management</h2>
        <button className="add-btn" onClick={() => setIsAddModalOpen(true)}>Add New Doctor</button>
      </div>
      <div className="doctor-filters">
        <input type="text" placeholder="Search by name or speciality…" className="search-input" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="date-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="off">Off</option>
        </select>
      </div>
      <div className="doctor-table-wrapper">
        <table className="doctor-table">
          <thead>
            <tr>
              <th>#</th><th>Doctor Name</th><th>Speciality</th><th>Experience</th><th>Qualification</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4,5].map(k=><SkeletonRow key={k}/>)}
            {!loading && filteredDoctors.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{doctorsData.length === 0 ? 'No doctors found. Add your first doctor.' : 'No doctors match your search.'}</td></tr>
            )}
            {!loading && filteredDoctors.map((doc: any, index: number) => (
              <tr key={doc.id} className={hoveredRowId === doc.id ? 'row-highlighted' : ''}>
                <td style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem' }}>#{String(index + 1).padStart(3, '0')}</td>
                <td
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTooltipData(doc);
                    setTooltipPos({ x: r.right + 10, y: r.top });
                    setHoveredRowId(doc.id);
                  }}
                  onMouseLeave={() => { setTooltipData(null); setHoveredRowId(null); }}
                  style={{ cursor: 'pointer' }}
                  className="doctor-name-cell"
                >
                  <span className="doctor-name-hover">{doc.name}</span>
                </td>
                <td>{doc.speciality}</td>
                <td>{doc.experience}</td>
                <td>{doc.qualification || '—'}</td>
                <td><span className={`status ${doc.status?.toLowerCase() || ''}`}>{doc.status}</span></td>
                <td className="dropdown-container" style={{ position: 'relative' }}>
                  <button className="action-btn" onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}>⋮</button>
                  {openDropdownId === doc.id && (
                    <div className="dropdown-menu">
                      <button onClick={() => { setSelectedDoctor(doc); setIsEditModalOpen(true); setOpenDropdownId(null); }}>Edit</button>
                      <button onClick={() => { setViewDoctor(doc); setIsViewModalOpen(true); setOpenDropdownId(null); }}>View</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltipData && (
        <div className="doctor-tooltip" style={{ position: 'fixed', left: Math.max(10, Math.min(tooltipPos.x, 1200)), top: Math.max(50, tooltipPos.y), minWidth: '280px', maxWidth: '350px' }}>
          <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}><strong>{tooltipData.name}</strong></div>
          <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.6' }}>
            <div><strong>Speciality:</strong> {tooltipData.speciality}</div>
            <div><strong>Experience:</strong> {tooltipData.experience}</div>
            <div><strong>Qualification:</strong> {tooltipData.qualification}</div>
            <div><strong>Status:</strong> {tooltipData.status}</div>
          </div>
        </div>
      )}

      <DoctorAddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddDoctor} />
      <DoctorEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onUpdate={handleUpdateDoctor} doctor={selectedDoctor} />
      <DoctorViewModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} doctor={viewDoctor} />
    </div>
    </>
  );
};

export default DoctorsPage;

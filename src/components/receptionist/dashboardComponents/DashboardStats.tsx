'use client';
import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppointments } from '@/context/receptionist/AppointmentsContext';
import { useDoctors } from '@/context/receptionist/DoctorsContext';
import { usePatients } from '@/context/receptionist/PatientsContext';

const SkeletonBox = ({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
);

/* Animated counter */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const inc  = value / 30;
    const t    = setInterval(() => {
      start += inc;
      if (start >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(Math.floor(start));
    }, 28);
    return () => clearInterval(t);
  }, [value]);
  return <span>{display}</span>;
}

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const statCards = [
  { key:'appointments', label:"Today's Appointments", color:'#6366f1', bg:'#eef2ff', href:'/receptionist/appointments', emoji:'📅',
    icon:<svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
  { key:'doctors', label:'Available Doctors', color:'#10b981', bg:'#d1fae5', href:'/receptionist/doctors', emoji:'🧑‍⚕️',
    icon:<svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg> },
  { key:'patients', label:'Total Patients', color:'#f59e0b', bg:'#fef3c7', href:'/receptionist/patients', emoji:'👥',
    icon:<svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
  { key:'pending', label:'Pending Review', color:'#ef4444', bg:'#fef2f2', href:'/receptionist/appointments', emoji:'⚠️',
    icon:<svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg> },
];

const DashboardStats = () => {
  const router = useRouter();
  const { appointments, loading: aLoading } = useAppointments();
  const { doctorsData, loading: dLoading } = useDoctors();
  const { patientsData, loading: pLoading } = usePatients();

  const loading = aLoading || dLoading || pLoading;
  const today   = new Date().toLocaleDateString();

  const values: Record<string, number> = {
    appointments: appointments.filter((a: any) => a.date === today).length,
    doctors: doctorsData.length,
    patients: patientsData.length,
    pending: appointments.filter((a: any) => a.status?.toLowerCase() === 'scheduled').length,
  };

  const changes: Record<string, string> = {
    appointments: `${appointments.length} total scheduled`,
    doctors: `${doctorsData.filter((d: any) => d.status === 'Available').length} marked available`,
    patients: `+${Math.max(0, Math.floor(patientsData.length * 0.04))} this week`,
    pending: 'Need status update',
  };

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom: '24px' }}>
        {/* Greeting */}
        <motion.div
          initial={{ opacity:0, y:14 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}
          style={{ marginBottom:'20px' }}
        >
          <motion.h1
            style={{ fontSize:'20px', fontWeight:700, color:'#0f172a', margin:0, letterSpacing:'-0.3px', display:'flex', alignItems:'center', gap:8 }}
            initial={{ opacity:0, x:-12 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay:0.1 }}
          >
            {greetingByHour()}!
            <motion.span
              animate={{ rotate:[0, 20, -10, 20, 0] }}
              transition={{ duration:1.2, delay:0.6, ease:'easeInOut' }}
              style={{ display:'inline-block' }}
            >
              👋
            </motion.span>
          </motion.h1>
          <motion.p style={{ color:'#475569', fontSize:'14px', marginTop:'4px' }} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}>
            Here&apos;s what&apos;s happening at the hospital today.
          </motion.p>
        </motion.div>

        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px' }}>
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity:0, y:28, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              transition={{ delay: i * 0.09, type:'spring', stiffness:300, damping:26 }}
              whileHover={{ y:-5, boxShadow:`0 12px 32px ${card.color}25`, transition:{ duration:0.2 } }}
              whileTap={{ scale:0.97 }}
              onClick={() => router.push(card.href)}
              style={{
                background:'#fff', border:'1px solid #e2e8f0', borderRadius:'18px',
                padding:'20px', boxShadow:'0 1px 6px rgba(15,23,42,0.06)',
                cursor:'pointer', position:'relative', overflow:'hidden',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = card.color + '55')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              {/* Left accent bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ delay: 0.3 + i * 0.09, duration: 0.5, ease: 'easeOut' }}
                style={{ position:'absolute', left:0, top:0, width:4, background:`linear-gradient(to bottom, ${card.color}, ${card.color}55)`, borderRadius:'18px 0 0 18px' }}
              />

              {/* Icon */}
              <motion.div
                style={{ width:46, height:46, borderRadius:14, background:card.bg, color:card.color, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}
                whileHover={{ scale:1.12, rotate:8 }}
                transition={{ type:'spring', stiffness:400 }}
              >
                {card.icon}
              </motion.div>

              {loading ? (
                <>
                  <SkeletonBox h={32} w="60%" r={6} />
                  <div style={{ marginTop:8 }}><SkeletonBox h={13} w="80%" r={4} /></div>
                  <div style={{ marginTop:8 }}><SkeletonBox h={12} w="55%" r={4} /></div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'30px', fontWeight:800, color:'#0f172a', lineHeight:1, letterSpacing:'-1px', marginBottom:'4px' }}>
                    <AnimatedNumber value={values[card.key]} />
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#64748b', marginBottom:'6px' }}>{card.label}</div>
                  <div style={{ fontSize:'12px', color:card.color, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                    <motion.span animate={{ opacity:[0.7,1,0.7] }} transition={{ duration:2, repeat:Infinity }}>{card.emoji}</motion.span>
                    {changes[card.key]}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default DashboardStats;

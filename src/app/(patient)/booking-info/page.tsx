'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppointments } from '@/context/patient/AppointmentsContext';
import { staggerContainer, fadeUp, scaleUp } from '@/lib/animations';
import '@/styles/patient/booking-info.css';

function ConfettiPiece({ color, delay }: { color: string; delay: number }) {
  const x = (Math.random() - 0.5) * 300;
  const y = -(Math.random() * 300 + 100);
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
      animate={{ opacity: 0, y, x, rotate: Math.random() * 720 - 360, scale: 0.3 }}
      transition={{ duration: 1.6, delay, ease: 'easeOut' }}
      style={{ position: 'absolute', width: 10, height: 10, borderRadius: Math.random() > 0.5 ? '50%' : 2, background: color, top: '50%', left: '50%', pointerEvents: 'none' }}
    />
  );
}

const CONFETTI_COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#06b6d4','#8b5cf6'];

const BookingInfoPage = () => {
  const router = useRouter();
  const { addAppointment } = useAppointments();
  const [appointment, setAppointment] = useState<any>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingAppointment');
    if (!raw) return;
    const data = JSON.parse(raw);
    sessionStorage.removeItem('pendingAppointment');
    addAppointment(data);
    setAppointment(data);
    setAppointmentId(data.id || null);
    setTimeout(() => setShowConfetti(false), 2200);
  }, [addAppointment]);

  const handleDownload = async () => {
    if (!appointment) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Appointment Slip', 70, 20);
    doc.setFontSize(12);
    doc.text(`Appointment ID: ${appointmentId || 'N/A'}`, 20, 40);
    doc.text(`Doctor: ${appointment.doctorName}`, 20, 50);
    doc.text(`Speciality: ${appointment.speciality}`, 20, 60);
    doc.text(`Date: ${appointment.date}`, 20, 70);
    doc.text(`Time: ${appointment.time}`, 20, 80);
    doc.text('Status: Confirmed', 20, 90);
    doc.save(`Appointment_${appointment.doctorName.replace(/\s/g, '_')}.pdf`);
  };

  if (!appointment) return (
    <motion.div className="booking-info-container" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <motion.h2 initial={{ y:10 }} animate={{ y:0 }}>No appointment found.</motion.h2>
      <motion.button className="back-btn" onClick={() => router.push('/my-appointments')} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}>
        Go to My Appointments
      </motion.button>
    </motion.div>
  );

  const confetti = Array.from({ length: 24 }).map((_, i) => ({
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: i * 0.04,
  }));

  return (
    <motion.div className="booking-info-container" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}>
      <motion.div
        className="booking-card"
        initial={{ opacity:0, scale:0.88, y:30 }}
        animate={{ opacity:1, scale:1, y:0 }}
        transition={{ type:'spring', stiffness:340, damping:28, delay:0.1 }}
        style={{ position:'relative', overflow:'visible' }}
      >
        {/* Confetti burst */}
        {showConfetti && (
          <div style={{ position:'absolute', top:'15%', left:'50%', pointerEvents:'none', zIndex:10 }}>
            {confetti.map((c, i) => <ConfettiPiece key={i} color={c.color} delay={c.delay} />)}
          </div>
        )}

        {/* Check icon with bounce */}
        <motion.div
          className="success-icon"
          initial={{ scale:0, rotate:-30 }}
          animate={{ scale:1, rotate:0 }}
          transition={{ type:'spring', stiffness:500, damping:22, delay:0.3 }}
          style={{ fontSize:52 }}
        >
          ✅
        </motion.div>

        <motion.h2 initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}>
          Appointment Confirmed!
        </motion.h2>

        <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.55 }}>
          Your appointment with <strong>{appointment.doctorName}</strong> ({appointment.speciality}) is booked.
        </motion.p>

        <motion.div
          className="booking-details"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ marginTop:12 }}
        >
          {appointmentId && (
            <motion.p variants={fadeUp}><strong>Appointment ID:</strong> {appointmentId}</motion.p>
          )}
          <motion.p variants={fadeUp}><strong>Date:</strong> {appointment.date}</motion.p>
          <motion.p variants={fadeUp}><strong>Time:</strong> {appointment.time}</motion.p>
          <motion.p variants={fadeUp}><strong>Status:</strong> <span style={{ color:'#22c55e', fontWeight:700 }}>Confirmed</span></motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity:0, y:16 }}
          animate={{ opacity:1, y:0 }}
          transition={{ delay:0.75 }}
          style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}
        >
          <motion.button
            className="download-btn ripple-btn"
            onClick={handleDownload}
            whileHover={{ scale:1.03, boxShadow:'0 8px 24px rgba(99,102,241,0.25)' }}
            whileTap={{ scale:0.97 }}
          >
            Download Appointment Slip (PDF)
          </motion.button>
          <motion.button
            className="back-btn ripple-btn"
            onClick={() => router.push('/my-appointments')}
            whileHover={{ scale:1.02 }}
            whileTap={{ scale:0.97 }}
          >
            Go to My Appointments
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default BookingInfoPage;

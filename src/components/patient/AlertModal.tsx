'use client';
import React from 'react';
import '@/styles/patient/alert-modal.css';

const AlertModal = ({ message }: { message: string }) => (
  <div className="alert">
    <div className="alert-content">
      <span className="alert-icon">✓</span>
      <span className="alert-message">{message}</span>
    </div>
  </div>
);

export default AlertModal;

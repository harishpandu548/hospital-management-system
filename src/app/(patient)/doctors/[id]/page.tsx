'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaUsers, FaBriefcase, FaStar, FaCommentDots, FaMapMarkerAlt, FaUserMd } from 'react-icons/fa';
import { CiShare2 } from 'react-icons/ci';
import { IoMdHeart, IoMdHeartEmpty } from 'react-icons/io';
import { useDoctors } from '@/context/patient/DoctorsContext';
import { useReviews } from '@/context/patient/ReviewsContext';
import '@/styles/patient/doctor-details.css';

const DoctorDetailsPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { doctorsData } = useDoctors();
  const { getLatestReviews, getReviewCount } = useReviews();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);

  const doctor = doctorsData.find((d: any) => d.id.toString() === id);

  if (!doctor) {
    return (
      <div className="not-found-container">
        <div className="not-found-card">
          <h2 className="not-found-title">Doctor Not Found</h2>
          <p className="not-found-text">The doctor you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const displayReviews = getLatestReviews(id, 3);
  const totalReviews = getReviewCount(id);
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const ReadMoreText = ({ text, maxLength = 120 }: { text: string; maxLength?: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!text) return null;
    const shouldTruncate = text.length > maxLength;
    const displayedText = isExpanded || !shouldTruncate ? text : text.slice(0, maxLength) + '...';
    return (
      <p>
        {displayedText}{' '}
        {shouldTruncate && (
          <span onClick={() => setIsExpanded(!isExpanded)} className="read-more">
            {isExpanded ? 'Read less' : 'Read more'}
          </span>
        )}
      </p>
    );
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Dr. ${doctor.name}`, text: `Check out ${doctor.name}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="doctor-details-container">
      <div className="doctor-header">
        <button className="goback-btn" onClick={() => router.back()}>←</button>
        <h2>Doctor Details</h2>
        <div className="header-icons">
          <button onClick={handleShare}><CiShare2 size={20} /></button>
          <button onClick={() => setIsFavorite(!isFavorite)}>
            {isFavorite ? <IoMdHeart size={20} color="#ef4444" /> : <IoMdHeartEmpty size={20} />}
          </button>
        </div>
      </div>

      <div className="doctor-profile">
        <div className="doctor-avatar"><FaUserMd size={40} /></div>
        <div className="doctor-info">
          <h3>{doctor.name}</h3>
          <p className="speciality">{doctor.speciality} | {doctor.experience}</p>
          <p className="location"><FaMapMarkerAlt /> Hyderabad, Telangana</p>
        </div>
      </div>

      <div className="doctor-stats">
        <div className="stat stat-patients"><FaUsers /><p className="stat-value">{doctor.patients}</p><p className="stat-label">Patients</p></div>
        <div className="stat stat-experience"><FaBriefcase /><p className="stat-value">{doctor.experience}</p><p className="stat-label">Experience</p></div>
        <div className="stat stat-rating"><FaStar /><p className="stat-value">{doctor.rating}</p><p className="stat-label">Rating</p></div>
        <div className="stat stat-reviews"><FaCommentDots /><p className="stat-value">{totalReviews}</p><p className="stat-label">Reviews</p></div>
      </div>

      <div className="info-section"><h4>Qualification</h4><p>{doctor.qualification}</p></div>
      <div className="info-section"><h4>About</h4><ReadMoreText text={doctor.description} maxLength={150} /></div>

      <div className="info-section">
        <h4>Working Hours</h4>
        <div className="hours-list">
          {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day) => (
            <div key={day} className={`day-row ${day === currentDay ? 'current-day' : ''}`}>
              <span className="day-name">{day}</span>
              <span className="day-time">{doctor.timings}</span>
            </div>
          ))}
          <div className="day-row">
            <span className="day-name">Sunday</span>
            <span className="day-time closed">Closed</span>
          </div>
        </div>
      </div>

      <div className="info-section reviews-section">
        <h4>Patient Reviews ({totalReviews})</h4>
        <div className="reviews-list">
          {displayReviews.length === 0 ? <p>No reviews yet.</p> : displayReviews.map((review: any) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="review-avatar">{review.name.charAt(0)}</div>
                <div className="review-info">
                  <h5>{review.name}</h5>
                  <div className="review-rating">
                    {[...Array(review.rating)].map((_, i) => <FaStar key={i} size={14} color="#fbbf24" />)}
                    <span className="review-date">{review.date}</span>
                  </div>
                </div>
              </div>
              <p className="review-comment">{review.comment}</p>
            </div>
          ))}
        </div>
        {displayReviews.length > 0 && (
          <button className="view-all-reviews-btn" onClick={() => router.push(`/reviews/${doctor.id}`)}>
            View All Reviews
          </button>
        )}
      </div>

      <div className="book-appointment-container">
        <button className="doctor-details-book-btn" onClick={() => router.push(`/DoctorsAppointment`)}>
          Book Appointment
        </button>
      </div>
    </div>
  );
};

export default DoctorDetailsPage;

'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaStar } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { useReviews } from '@/context/patient/ReviewsContext';
import { useDoctors } from '@/context/patient/DoctorsContext';
import '@/styles/patient/reviews.css';

const SORT_OPTIONS: Record<string, string> = { best: 'Best Reviews', recent: 'Date (Latest)' };

const parseRelativeDate = (label: string) => {
  if (!label) return Number.MAX_SAFE_INTEGER;
  const v = label.trim().toLowerCase();
  if (v === 'just now') return 0;
  const match = v.match(/(\d+)\s+(day|days|week|weeks|month|months|year|years)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1]);
  const unit = match[2].replace(/s$/, '');
  const unitMap: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };
  return amount * (unitMap[unit] ?? 365);
};

const ReviewsPage = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { getReviewsByDoctorId } = useReviews();
  const { doctorsData } = useDoctors();
  const [sortOption, setSortOption] = useState('best');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doctor = doctorsData.find((d: any) => d.id.toString() === id);
  const allReviews = getReviewsByDoctorId(id);

  const sortedReviews = useMemo(() => {
    const copy = [...allReviews];
    if (sortOption === 'recent') return copy.sort((a, b) => parseRelativeDate(a.date) - parseRelativeDate(b.date));
    return copy.sort((a, b) => b.rating - a.rating || parseRelativeDate(a.date) - parseRelativeDate(b.date));
  }, [allReviews, sortOption]);

  const fiveStarPct = allReviews.length === 0
    ? 0
    : Math.round((allReviews.filter((r) => r.rating === 5).length / allReviews.length) * 100);

  if (!doctor) {
    return (
      <div className="reviews-container">
        <div className="reviews-header">
          <button className="back-btn" onClick={() => router.back()}>← Back</button>
          <h2>Doctor Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-container">
      <div className="reviews-header">
        <div className="reviews-header-top">
          <button className="back-btn" onClick={() => router.back()}>← Back</button>
          <div className="filter-control" ref={dropdownRef}>
            <button className="filter-toggle" onClick={() => setIsFilterOpen((p) => !p)}>
              <FiFilter size={16} />
              <span>{SORT_OPTIONS[sortOption]}</span>
            </button>
            {isFilterOpen && (
              <div className="filter-dropdown" role="menu">
                {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                  <button
                    key={value}
                    className={`filter-option ${sortOption === value ? 'active' : ''}`}
                    onClick={() => { setSortOption(value); setIsFilterOpen(false); }}
                    role="menuitem"
                  >{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="reviews-header-content">
          <h2>Patient Reviews</h2>
          <p className="doctor-name">{doctor.name}</p>
          <p className="doctor-specialty">{doctor.speciality}</p>
        </div>
      </div>

      <div className="reviews-stats">
        <div className="stats-item"><h3>{allReviews.length}</h3><p>Total Reviews</p></div>
        <div className="stats-item"><h3>{doctor.rating} <FaStar className="star-icon" /></h3><p>Average Rating</p></div>
        <div className="stats-item"><h3>{fiveStarPct}%</h3><p>5-Star Reviews</p></div>
      </div>

      <div className="all-reviews-list">
        {sortedReviews.map((review) => (
          <div key={review.id} className="review-card-full">
            <div className="review-card-header">
              <div className="review-avatar-full">{review.name.charAt(0)}</div>
              <div className="review-info-full">
                <h4>{review.name}</h4>
                <div className="review-rating-full">
                  {[...Array(review.rating)].map((_, i) => <FaStar key={`f${review.id}-${i}`} size={16} color="#fbbf24" />)}
                  {[...Array(5 - review.rating)].map((_, i) => <FaStar key={`e${review.id}-${i}`} size={16} color="#e5e7eb" />)}
                  <span className="review-date-full">{review.date}</span>
                </div>
              </div>
            </div>
            <p className="review-comment-full">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsPage;

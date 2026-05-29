'use client';
import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import '@/styles/patient/review-badge.css';

const ReviewBadge = ({ rating, reviews }: { rating: number; reviews: number }) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++) stars.push(<FaStar key={`f${i}`} className="star" />);
    if (halfStar) stars.push(<FaStarHalfAlt key="h" className="star" />);
    for (let i = 0; i < emptyStars; i++) stars.push(<FaRegStar key={`e${i}`} className="star" />);
    return stars;
  };

  return (
    <div className="review-badge">
      <span className="rating">{rating}</span>
      <span className="stars">{renderStars()}</span>
      <span className="dot">•</span>
      <span className="reviews">{reviews} Reviews</span>
    </div>
  );
};

export default ReviewBadge;

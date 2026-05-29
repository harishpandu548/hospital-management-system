'use client';
import React, { createContext, useContext, useState } from 'react';
import reviewsData from '@/data/patient/reviews';

interface Review {
  id: number;
  doctorId: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

interface ReviewsContextType {
  reviews: Review[];
  getReviewsByDoctorId: (doctorId: string | number) => Review[];
  getLatestReviews: (doctorId: string | number, limit?: number) => Review[];
  addReview: (review: Omit<Review, 'id' | 'date'>) => void;
  getAverageRating: (doctorId: string | number) => string;
  getReviewCount: (doctorId: string | number) => number;
}

const ReviewsContext = createContext<ReviewsContextType>({
  reviews: [],
  getReviewsByDoctorId: () => [],
  getLatestReviews: () => [],
  addReview: () => {},
  getAverageRating: () => '0',
  getReviewCount: () => 0,
});

export const useReviews = () => useContext(ReviewsContext);

export const ReviewsProvider = ({ children }: { children: React.ReactNode }) => {
  const [reviews, setReviews] = useState<Review[]>(reviewsData);

  const getReviewsByDoctorId = (doctorId: string | number) =>
    reviews.filter((r) => r.doctorId === parseInt(String(doctorId)));

  const getLatestReviews = (doctorId: string | number, limit = 3) =>
    getReviewsByDoctorId(doctorId).slice(0, limit);

  const addReview = (newReview: Omit<Review, 'id' | 'date'>) => {
    setReviews((prev) => [{ ...newReview, id: prev.length + 1, date: 'Just now' }, ...prev]);
  };

  const getAverageRating = (doctorId: string | number) => {
    const doctorReviews = getReviewsByDoctorId(doctorId);
    if (doctorReviews.length === 0) return '0';
    const sum = doctorReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / doctorReviews.length).toFixed(1);
  };

  const getReviewCount = (doctorId: string | number) => getReviewsByDoctorId(doctorId).length;

  return (
    <ReviewsContext.Provider
      value={{ reviews, getReviewsByDoctorId, getLatestReviews, addReview, getAverageRating, getReviewCount }}
    >
      {children}
    </ReviewsContext.Provider>
  );
};

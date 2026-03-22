import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [graceExpired, setGraceExpired] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => setGraceExpired(true), 300);
      return () => clearTimeout(timer);
    } else {
      setGraceExpired(false);
    }
  }, [loading, user]);

  if (loading || (!user && !graceExpired)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

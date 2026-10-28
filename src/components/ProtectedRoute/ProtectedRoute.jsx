import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const userStr = localStorage.getItem('senati_user');
  let isValid = false;

  try {
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
      const parsed = JSON.parse(userStr);
      if (parsed && parsed.email) {
        isValid = true;
      }
    }
  } catch (e) {
    isValid = false;
  }

  if (!isValid) {
    localStorage.removeItem('senati_user');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

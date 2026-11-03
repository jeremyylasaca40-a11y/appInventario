import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('senati_user');

  // Si no hay sesión, redirigir al login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere roles específicos y el usuario no cuenta con ellos
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.rol)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

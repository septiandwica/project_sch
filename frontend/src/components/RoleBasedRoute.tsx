// components/RoleBasedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

// Fungsi untuk decode JWT token (sama seperti di Layout)
const jwtDecode = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'lecturer'; // Role yang diperlukan untuk mengakses route
  allowedRoles?: string[]; // Array role yang diizinkan
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  requiredRole,
  allowedRoles 
}) => {
  const token = localStorage.getItem('access_token');
  
  // Jika tidak ada token, redirect ke login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Decode token untuk mendapatkan user info
  const decoded = jwtDecode(token);
  if (!decoded || !decoded.sub) {
    // Token tidak valid, hapus dan redirect ke login
    localStorage.removeItem('access_token');
    return <Navigate to="/login" replace />;
  }

  const userRole = decoded.sub.role;

  // Jika menggunakan requiredRole (untuk role spesifik)
  if (requiredRole) {
    if (userRole !== requiredRole) {
      // Jika lecturer mencoba akses route admin, redirect ke schedule
      if (requiredRole === 'admin' && userRole === 'lecturer') {
        return <Navigate to="/schedule/calender" replace />;
      }
      // Untuk kasus lain, redirect ke home atau schedule
      return <Navigate to={userRole === 'admin' ? "/home" : "/schedule/calender"} replace />;
    }
  }

  // Jika menggunakan allowedRoles (untuk multiple roles)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to={userRole === 'admin' ? "/home" : "/schedule/calender"} replace />;
    }
  }

  // Jika tidak ada pembatasan role atau role sesuai, render children
  return <>{children}</>;
};

export default RoleBasedRoute;
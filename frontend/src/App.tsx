import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ScheduleOptimization from "./pages/ScheduleOptimization";
import ConflictPrediction from "./pages/ConflictPrediction";
import RoomAvailability from "./pages/RoomAvailability";
import LecturerOptimization from "./pages/LecturerOptimization";
import Fixed from "./pages/Fixed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ScheduleCalender from "./pages/ScheduleCalender";
import FixedSchedule from "./pages/FixedSchedule";
import ProtectedRoute from "./components/PrivateRoute";
import RoleBasedRoute from "./components/RoleBasedRoute"; // Import komponen baru
import Calendar from "./pages/Calendar";

// Fungsi helper untuk decode JWT token
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

// Komponen untuk redirect berdasarkan role
const RoleBasedRedirect = () => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const decoded = jwtDecode(token);
  if (!decoded || !decoded.sub) {
    localStorage.removeItem('access_token');
    return <Navigate to="/login" replace />;
  }

  const userRole = decoded.sub.role;
  
  // Redirect berdasarkan role
  if (userRole === 'admin') {
    return <Navigate to="/home" replace />;
  } else if (userRole === 'lecturer') {
    return <Navigate to="/schedule/calender" replace />;
  } else {
    // Role tidak dikenal, redirect ke login
    localStorage.removeItem('access_token');
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Redirect berdasarkan authentication dan role */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* ADMIN ONLY ROUTES */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <Home />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <ScheduleOptimization />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/conflict"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <ConflictPrediction />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <RoomAvailability />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/lecturer"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <LecturerOptimization />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fixed"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <Fixed />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule/fixed"
            element={
              <ProtectedRoute>
                <RoleBasedRoute requiredRole="admin">
                  <Layout>
                    <FixedSchedule />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />

          {/* ROUTES YANG BISA DIAKSES SEMUA ROLE (ADMIN & LECTURER) */}
          <Route
            path="/schedule/calender"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'lecturer']}>
                  <Layout>
                    <ScheduleCalender />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />

          {/* Dynamic route for schedule calendar with selected major */}
          <Route
            path="/schedule/calender/:major"
            element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRoles={['admin', 'lecturer']}>
                  <Layout>
                    <Calendar />
                  </Layout>
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          />

          {/* Catch all route - redirect berdasarkan role */}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
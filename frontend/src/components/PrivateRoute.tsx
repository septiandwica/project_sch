import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');  // Check if the user has a valid token

  React.useEffect(() => {
    // If the user is not authenticated, redirect to login page
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // If authenticated, render the child components (protected content)
  return token ? <>{children}</> : null; // Don't render anything until the redirect is done
};

export default ProtectedRoute;

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  AlertTriangle, 
  DoorOpen, 
  Menu, 
  X, 
  Sun, 
  Moon,
  User,
  Settings,
  FileText,
  LogOut
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Fungsi untuk decode JWT token
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

interface LayoutProps {
  children: React.ReactNode;
}

interface UserInfo {
  id: number;
  username: string;
  role: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const navigate = useNavigate();

  // Navigation untuk admin (semua menu)
  const adminNavigation = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Schedule Optimization', href: '/schedule', icon: Calendar },
    { name: 'Lecturer Optimization', href: '/lecturer', icon: User },
    { name: 'Conflict Prediction', href: '/conflict', icon: AlertTriangle },
    { name: 'Room Availability', href: '/rooms', icon: DoorOpen },
    { name: 'Fixed Conflict', href: '/fixed', icon: FileText },
    { name: 'Schedule', href: '/schedule/calender', icon: FileText },
    { name: 'Store to Database', href: '/schedule/fixed', icon: FileText }
  ];

  // Navigation untuk non-admin (lecturer - hanya Schedule)
  const lecturerNavigation = [
    { name: 'Schedule', href: '/schedule/calender', icon: FileText }
  ];

  // Menentukan navigation berdasarkan role
  const navigation = userInfo?.role === 'admin' ? adminNavigation : lecturerNavigation;

  const isCurrentPath = (path: string) => location.pathname === path;

  useEffect(() => {
    // Decode JWT token untuk mendapatkan user info
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded && decoded.sub) {
        setUserInfo(decoded.sub);
      } else {
        // Jika token tidak valid, redirect ke login
        navigate('/login');
      }
    } else {
      // Jika tidak ada token, redirect ke login
      navigate('/login');
    }

    const checkHealth = async () => {
      try {
        const health = await apiService.healthCheck();
        setHealthStatus(health);
      } catch (error) {
        console.error("Health check failed:", error);
        setHealthStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, [navigate]);

  const handleLogout = () => {
    // Menghapus token dari localStorage
    localStorage.removeItem('access_token');
    // Reset user info
    setUserInfo(null);
    // Redirect ke login
    navigate('/login');
  };

  // Jika user info belum loaded, tampilkan loading
  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Schedule Optimization
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {userInfo.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {userInfo.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const current = isCurrentPath(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    current
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleTheme}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 mr-3" />
              ) : (
                <Sun className="w-5 h-5 mr-3" />
              )}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {navigation.find(item => isCurrentPath(item.href))?.name || 'Dashboard'}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* System status */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Checking...</span>
                  </div>
                ) : healthStatus ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-600">System Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-red-600">System Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
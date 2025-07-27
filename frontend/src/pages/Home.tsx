import React, { useEffect, useState } from 'react';
import { Calendar, AlertTriangle, DoorOpen, Activity, TrendingUp } from 'lucide-react';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Home: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await apiService.healthCheck();
        setHealthStatus(health);
      } catch (error) {
        console.error('Health check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  const features = [
    {
      title: 'Schedule Optimization',
      description: 'Optimize room assignments and scheduling for maximum efficiency',
      icon: Calendar,
      color: 'bg-blue-500',
      href: '/schedule'
    },
    {
      title: 'Conflict Prediction',
      description: 'Detect and prevent scheduling conflicts using machine learning',
      icon: AlertTriangle,
      color: 'bg-orange-500',
      href: '/conflict'
    },
    {
      title: 'Room Availability',
      description: 'Predict and analyze room availability patterns',
      icon: DoorOpen,
      color: 'bg-green-500',
      href: '/rooms'
    }
  ];

  const stats = [
    { name: 'System Uptime', value: '99.9%', icon: Activity, color: 'text-green-600' },
    { name: 'Processing Speed', value: '< 2s', icon: TrendingUp, color: 'text-blue-600' },
    { name: 'Accuracy Rate', value: '95%+', icon: AlertTriangle, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-4">
          Welcome to Room Scheduler Dashboard
        </h1>
        <p className="text-blue-100 text-lg max-w-2xl">
          Efficiently manage room scheduling, predict conflicts, and optimize resource allocation 
          with our intelligent room management system.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {feature.description}
              </p>
              <a
                href={feature.href}
                className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
              >
                Get Started →
              </a>
            </div>
          );
        })}
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Status
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Checking system status...
            </span>
          </div>
        ) : healthStatus ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-600 font-medium">System Online</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Service Information</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {healthStatus.service} v{healthStatus.version}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Available Endpoints</h3>
                <div className="space-y-1">
                  {Object.keys(healthStatus.endpoints || {}).map((endpoint) => (
                    <div key={endpoint} className="text-sm text-gray-600 dark:text-gray-400">
                      {endpoint.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span className="text-red-600 font-medium">System Offline</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
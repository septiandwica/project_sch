import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const SchedulePage: React.FC = () => {
  const [majors, setMajors] = useState<string[]>([]);
  const navigate = useNavigate();

  // Fetch the list of majors
  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const response = await apiService.getSchedule();
        const uniqueMajors = Array.from(new Set(response.map(event => event.major)));
        setMajors(uniqueMajors);
      } catch (error) {
        console.error("Failed to fetch majors", error);
      }
    };

    fetchMajors();
  }, []);

  // Navigate to the calendar page with the selected major
  const handleMajorClick = (major: string) => {
    navigate(`/schedule/calender/${major}`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Select Major</h1>

      {/* Display Major Buttons */}
      <div className="flex flex-wrap gap-2">
        {majors.map((major, index) => (
          <button
            key={index}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
            onClick={() => handleMajorClick(major)}
          >
            {major}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SchedulePage;

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import rrulePlugin from '@fullcalendar/rrule'; // Plugin for recurring events
import { apiService } from '../services/api';

const ScheduleCalendar: React.FC = () => {
  const { major } = useParams(); // Get the major from URL params
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);

  // Format event data
  const formatEventData = (data: any[]) => {
    return data.map(event => {
      const parseDate = (dateString: string) => {
        const day = dateString.slice(0, 3);
        const time = dateString.slice(4);

        const today = new Date();
        const daysOfWeek: { [key: string]: number } = {
          "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6, "Sun": 7,
        };

        const dayOffset = daysOfWeek[day] - today.getDay();
        const eventDate = new Date(today.setDate(today.getDate() + dayOffset));

        const formattedTime = time.replace("::", ":");
        const isoDate = new Date(eventDate.setHours(parseInt(formattedTime.slice(1, 3)), parseInt(formattedTime.slice(4, 6))));

        return isoDate.toISOString();
      };

      const startDate = parseDate(event.start);
      const endDate = parseDate(event.end);

      if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
        console.error(`Invalid date for event: ${event.title}`);
        return null;
      }

      const rrule = {
        freq: 'weekly',           // Weekly recurrence
        dtstart: startDate,       // Start date of recurrence
        until: '2025-12-31T23:59:59Z',  // End date of recurrence (December 2025)
        interval: 1,              // Weekly interval
        byweekday: [ 'mo', 'tu', 'we', 'th', 'fr'],  // Recurrence on weekdays
      };

      return {
        id: event.id,
        title: event.title,
        major: event.major,
        start: startDate,
        end: endDate,
        description: event.lecturer + " - " + event.room,
        rrule: rrule,
      };
    }).filter(event => event !== null);
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await apiService.getSchedule();
        const formattedEvents = formatEventData(response);
        setEvents(formattedEvents);

        // Filter events based on the selected major
        const filtered = formattedEvents.filter((event) => event.major === major);
        setFilteredEvents(filtered);
      } catch (error) {
        console.error("Failed to fetch schedule", error);
      }
    };

    if (major) {
      fetchSchedule();
    }
  }, [major]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Schedule for {major}</h1>

      <FullCalendar
        plugins={[dayGridPlugin, rrulePlugin]} // Add rrule plugin for recurring events
        initialView="dayGridMonth"
        events={filteredEvents}
        eventClick={(info) => {
          alert(`You clicked on ${info.event.title}`);
        }}
        eventColor="#3788d8"
      />
    </div>
  );
};

export default ScheduleCalendar;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { eventAPI } from '../services/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [currentEventData, setCurrentEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Load all events on mount or when user logs in
  useEffect(() => {
    if (user) {
      loadEvents();
    } else {
      setEvents([]);
      setSelectedEventId(null);
      setCurrentEventData(null);
      setLoading(false);
    }
  }, [user]);

  // When selectedEventId changes, load specific event details and join socket room
  useEffect(() => {
    if (selectedEventId) {
      loadEventDetails(selectedEventId);
      if (socket && user) {
        socket.emit('join_event', { eventId: selectedEventId, userId: user.id, role: user.role });
      }
    } else {
      setCurrentEventData(null);
    }
  }, [selectedEventId, socket, user]);

  // Listen for socket updates to the active event
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (data) => {
      if (selectedEventId) loadEventDetails(selectedEventId);
    };

    const handleIssueUpdated = (data) => {
      if (selectedEventId) loadEventDetails(selectedEventId);
    };

    socket.on('task_updated', handleTaskUpdated);
    socket.on('issue_updated', handleIssueUpdated);

    return () => {
      socket.off('task_updated', handleTaskUpdated);
      socket.off('issue_updated', handleIssueUpdated);
    };
  }, [socket, selectedEventId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await eventAPI.getAll();
      if (res.data.success) {
        const eventList = res.data.data || [];
        setEvents(eventList);
        
        if (eventList.length > 0) {
          // If previous selection is valid, keep it; otherwise select the first event
          const exists = eventList.some(e => e.id === selectedEventId);
          if (!exists) {
            setSelectedEventId(eventList[0].id);
          }
        } else {
          setSelectedEventId(null);
          setCurrentEventData(null);
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventDetails = async (eventId) => {
    try {
      const res = await eventAPI.getById(eventId);
      if (res.data.success) {
        setCurrentEventData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
    }
  };

  const switchEvent = (eventId) => {
    setSelectedEventId(eventId);
  };

  const refreshEventData = () => {
    if (selectedEventId) {
      loadEventDetails(selectedEventId);
    }
    loadEvents();
  };

  return (
    <EventContext.Provider value={{
      events,
      selectedEventId,
      currentEventData,
      loading,
      switchEvent,
      refreshEventData,
      loadEvents
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => useContext(EventContext);

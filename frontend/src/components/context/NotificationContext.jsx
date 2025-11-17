import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotificationCount = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationCount must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { user } = useAuth();

  // Reset count when user changes
  useEffect(() => {
    if (!user?.id) {
      setNotificationCount(0);
    }
  }, [user?.id]);

  const updateNotificationCount = (count) => {
    setNotificationCount(count);
  };

  const incrementNotificationCount = () => {
    setNotificationCount(prev => prev + 1);
  };

  const decrementNotificationCount = () => {
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  const resetNotificationCount = () => {
    setNotificationCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notificationCount,
      updateNotificationCount,
      incrementNotificationCount,
      decrementNotificationCount,
      resetNotificationCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
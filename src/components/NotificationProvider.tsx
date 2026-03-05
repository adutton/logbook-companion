import React from 'react';
import { NotificationContext, useNotificationState } from '../hooks/useNotifications';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useNotificationState();
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

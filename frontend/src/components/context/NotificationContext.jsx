import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../supabaseClient';

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

  // Function to fetch notification count using exact same logic as notifications page
  const fetchNotificationCount = useCallback(async () => {
    if (!user?.id) {
      setNotificationCount(0);
      return;
    }

    try {
      // Get user data - same as notifications page
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('d_uuid, position')
        .eq('uuid', user.id)
        .single();

      if (userError || !userData?.d_uuid) {
        setNotificationCount(0);
        return;
      }

      const userDepartmentId = userData.d_uuid;
      const isHead = userData.position === 'head';

      // Calculate 4 days ago - exact same logic as notifications page
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      fourDaysAgo.setHours(0, 0, 0, 0);
      const fourDaysAgoStr = fourDaysAgo.toISOString();

      // Query notifications - exact same as notifications page
      let notificationsQuery;
      if (isHead) {
        notificationsQuery = supabase
          .from('notifications')
          .select('notif_id, f_uuid, is_seen, is_sent, created_at')
          .eq('uuid', user.id)
          .eq('is_seen', false)
          .gte('created_at', fourDaysAgoStr)
          .order('created_at', { ascending: false });
      } else {
        notificationsQuery = supabase
          .from('notifications')
          .select('notif_id, f_uuid, is_seen, is_sent, created_at')
          .eq('uuid', user.id)
          .eq('is_seen', false)
          .eq('is_sent', true)
          .gte('created_at', fourDaysAgoStr)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await notificationsQuery;

      if (error || !data) {
        setNotificationCount(0);
        return;
      }

      // Get file details - exact same as notifications page
      const fileIds = data.map(n => n.f_uuid);
      if (fileIds.length === 0) {
        setNotificationCount(0);
        return;
      }

      const { data: fileData, error: fileError } = await supabase
        .from('file')
        .select(`
          f_uuid, 
          f_name, 
          created_at, 
          d_uuid,
          department:d_uuid(d_name),
          file_department(
            fd_uuid,
            d_uuid,
            is_approved
          )
        `)
        .in('f_uuid', fileIds);

      if (fileError || !fileData) {
        setNotificationCount(0);
        return;
      }

      // Create file map - exact same as notifications page
      const fileMap = {};
      fileData.forEach(file => {
        fileMap[file.f_uuid] = file;
      });

      // Deduplicate notifications - exact same as notifications page
      const sortedByNewest = data.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const seenFiles = new Set();
      const latestPerFile = [];
      for (const n of sortedByNewest) {
        if (!seenFiles.has(n.f_uuid)) {
          seenFiles.add(n.f_uuid);
          latestPerFile.push(n);
        }
      }

      // Filter notifications - exact same logic as notifications page
      const visibleNotifications = latestPerFile.filter(notification => {
        const file = fileMap[notification.f_uuid];
        
        if (!file) return false;
        
        // Files from user's own department are always visible
        if (file.d_uuid === userDepartmentId) return true;
        
        // For pending approval notifications (is_sent = null), only show to heads
        if (notification.is_sent === null) {
          return isHead;
        }

        // For files from other departments, check if approved for user's department
        const hasApprovedRelation = file.file_department?.some(fd => 
          fd.d_uuid === userDepartmentId && fd.is_approved === 'approved'
        );

        return hasApprovedRelation;
      });

      setNotificationCount(visibleNotifications.length);
    } catch (err) {
      setNotificationCount(0);
    }
  }, [user?.id]);

  // Fetch count when user changes or component mounts
  useEffect(() => {
    if (user?.id) {
      fetchNotificationCount();
    } else {
      setNotificationCount(0);
    }
  }, [user?.id, fetchNotificationCount]);

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

  const refreshNotificationCount = () => {
    fetchNotificationCount();
  };

  return (
    <NotificationContext.Provider value={{
      notificationCount,
      updateNotificationCount,
      incrementNotificationCount,
      decrementNotificationCount,
      resetNotificationCount,
      refreshNotificationCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
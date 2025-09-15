import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  DocumentTextIcon, 
  BellIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

// Helper function for time formatting
const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "Unknown time";
  }
};

// Helper function for date formatting and grouping
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Compare dates ignoring time
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  
  // For other dates, return formatted date
  return date.toLocaleDateString();
};

const Notifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [dateGroups, setDateGroups] = useState({});

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Calculate date 4 days ago
        const fourDaysAgo = new Date();
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        fourDaysAgo.setHours(0, 0, 0, 0);
        const fourDaysAgoStr = fourDaysAgo.toISOString();
        
        // First check if notifications exist for today's files
        await ensureTodaysNotifications();
        
        // Basic query with date filter
        const { data, error } = await supabase
          .from('notifications')
          .select('f_uuid, is_seen, created_at')
          .eq('uuid', user.id)
          .eq('is_seen', false)
          .gte('created_at', fourDaysAgoStr)
          .order('created_at', { ascending: false });
        
        if (error) {
          setError(`Database error: ${error.message}`);
          setLoading(false);
          return;
        }
        
        if (!data || data.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Get file details in a separate query
        const fileIds = data.map(n => n.f_uuid);
        const { data: fileData, error: fileError } = await supabase
          .from('file')
          .select('f_uuid, f_name, created_at')
          .in('f_uuid', fileIds);
        
        if (fileError) {
          setError(`File data error: ${fileError.message}`);
          setLoading(false);
          return;
        }
        
        // Create a map for quick lookup
        const fileMap = {};
        (fileData || []).forEach(file => {
          fileMap[file.f_uuid] = file;
        });
        
        // Map notifications to include file details
        const notificationItems = (data || [])
          .filter(notification => fileMap[notification.f_uuid])
          .map(notification => ({
            f_uuid: notification.f_uuid,
            f_name: fileMap[notification.f_uuid]?.f_name || 'Unknown file',
            created_at: notification.created_at,
            dateGroup: formatDate(notification.created_at)
          }));
        
        // Group by date for display
        const groups = {};
        notificationItems.forEach(item => {
          const group = item.dateGroup;
          if (!groups[group]) groups[group] = [];
          groups[group].push(item);
        });
        
        setDateGroups(groups);
        setItems(notificationItems);
      } catch (err) {
        setError(`Unexpected error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    // Function to ensure notifications exist for today's files
    const ensureTodaysNotifications = async () => {
      if (!user?.id) return;
      
      try {
        // Get user's department
        const { data: userData } = await supabase
          .from('users')
          .select('d_uuid')
          .eq('uuid', user.id)
          .single();
        
        if (!userData?.d_uuid) return;
        
        // Get today's start in ISO format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        // Get files from user's department created today
        const { data: todayFiles } = await supabase
          .from('file')
          .select(`
            f_uuid, 
            created_at,
            file_department!inner(d_uuid)
          `)
          .eq('file_department.d_uuid', userData.d_uuid)
          .gte('created_at', todayStr);
        
        if (!todayFiles?.length) return;
        
        // For each file, check if notification exists - INCLUDING SEEN ONES
        for (const file of todayFiles) {
          // Check if ANY notification exists for this file-user pair
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('f_uuid', file.f_uuid)
            .eq('uuid', user.id);
          
          if (count === 0) {
            // Create notification if none exists
            await supabase
              .from('notifications')
              .insert({
                uuid: user.id,
                f_uuid: file.f_uuid,
                is_seen: false,
                created_at: new Date().toISOString()
              });
          } else {
            // If notification exists but is marked as seen, update it to unseen
            await supabase
              .from('notifications')
              .update({ is_seen: false })
              .eq('f_uuid', file.f_uuid)
              .eq('uuid', user.id);
          }
        }
      } catch (err) {
        console.error("Error ensuring today's notifications:", err);
      }
    };

    fetchNotifications();
    
    // Set up real-time listeners
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications', filter: `uuid=eq.${user?.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BellIcon className="h-6 w-6 text-gray-700" />
          Notifications
        </h1>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading notifications</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline">
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-current border-t-transparent text-blue-600"
            role="status"
            aria-label="loading"
          />
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-gray-100 rounded-full p-3 mb-4">
            <BellIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800">No new notifications</h3>
          <p className="mt-1 text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Render notifications grouped by date */}
          {Object.entries(dateGroups).map(([dateGroup, groupItems]) => (
            <div key={dateGroup} className="border-b border-gray-200 last:border-b-0">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateGroup}
              </div>
              <ul className="divide-y divide-gray-100">
                {groupItems.map(file => (
                  <li 
                    key={file.f_uuid} 
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-blue-100 text-blue-600 rounded-lg p-2.5 flex-shrink-0">
                        <DocumentTextIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 font-medium truncate">
                          {file.f_name || "Unnamed File"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Added at {formatTime(file.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <a
                      href={`/file/${file.f_uuid}?from=notification`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 flex-shrink-0 inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
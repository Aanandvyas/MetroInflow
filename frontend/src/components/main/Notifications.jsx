import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  DocumentTextIcon, 
  BellIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Helper functions
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDate = (iso) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

// Group notifications by date
const groupByDate = (notifications) => {
  const groups = {};
  notifications.forEach(notification => {
    const date = new Date(notification.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(notification);
  });
  
  return Object.entries(groups)
    .map(([date, items]) => ({
      date: new Date(date),
      displayDate: formatDate(date),
      items
    }))
    .sort((a, b) => b.date - a.date);
};

const Notifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Calculate date 4 days ago
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const fourDaysAgoStr = fourDaysAgo.toISOString();

    const loadNotifications = async () => {
      try {
        console.log("Fetching notifications for user:", user.id);
        
        // Simplified query - separate steps for better debugging
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('f_uuid, is_seen, created_at')
          .eq('uuid', user.id)
          .eq('is_seen', false)
          .gte('created_at', fourDaysAgoStr)
          .order('created_at', { ascending: false });
          
        if (notifError) {
          console.error("Error fetching notifications:", notifError);
          setError("Failed to load notifications: " + notifError.message);
          setLoading(false);
          return;
        }
        
        console.log("Notifications found:", notifications?.length || 0);
        
        if (!notifications || notifications.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }
        
        // Get file details for each notification
        const fileUuids = notifications.map(n => n.f_uuid);
        const { data: fileDetails, error: fileError } = await supabase
          .from('file')
          .select('f_uuid, f_name, created_at')
          .in('f_uuid', fileUuids);
          
        if (fileError) {
          console.error("Error fetching file details:", fileError);
          setError("Failed to load file details: " + fileError.message);
          setLoading(false);
          return;
        }
        
        // Map file details to notifications
        const fileMap = {};
        fileDetails.forEach(file => {
          fileMap[file.f_uuid] = file;
        });
        
        const notificationItems = notifications
          .filter(n => fileMap[n.f_uuid]) // Only keep notifications with valid files
          .map(n => ({
            f_uuid: n.f_uuid,
            f_name: fileMap[n.f_uuid].f_name,
            created_at: n.created_at
          }));
          
        console.log("Processed notification items:", notificationItems.length);
        setItems(notificationItems);
      } catch (err) {
        console.error("Exception in loadNotifications:", err);
        setError("An unexpected error occurred: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Set up subscription for real-time updates
    const notificationsChannel = supabase
      .channel('notification-updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `uuid=eq.${user.id}` }, 
        (payload) => {
          console.log("Notification update:", payload);
          if (payload.new.is_seen) {
            setItems(prev => prev.filter(item => item.f_uuid !== payload.new.f_uuid));
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [user?.id]); // Simplified dependency array

  const groupedNotifications = groupByDate(items);

  // Render component with better error handling and debug info
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BellIcon className="h-6 w-6 text-gray-700" />
          Notifications
        </h1>
        {items.length > 0 && (
          <button 
            onClick={() => window.location.reload()}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        )}
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
          <p className="mt-1 text-gray-500">You're all caught up! Check back later for updates.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {groupedNotifications.map((group, index) => (
            <div key={group.displayDate} className={index > 0 ? "border-t border-gray-100" : ""}>
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                {group.displayDate}
              </div>
              <ul className="divide-y divide-gray-100">
                {group.items.map(file => (
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
                          {file.f_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Added at {formatTime(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/file/${file.f_uuid}?from=notification`}
                      className="ml-4 flex-shrink-0 inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      View
                    </Link>
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
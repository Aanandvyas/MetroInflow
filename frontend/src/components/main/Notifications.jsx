import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNotificationCount } from '../context/NotificationContext';
import { 
  DocumentTextIcon, 
  BellIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon,
  BuildingOfficeIcon
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
  const { updateNotificationCount } = useNotificationCount();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [dateGroups, setDateGroups] = useState({});
  const [processingActions, setProcessingActions] = useState(new Set());

  // Handle approval/rejection actions
  const handleApprovalAction = async (fileId, action, notificationId) => {
    const actionKey = `${fileId}-${action}`;
    if (processingActions.has(actionKey)) return;

    setProcessingActions(prev => new Set(prev).add(actionKey));

    try {
      // Get user's department to confirm they're a head
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('d_uuid, position')
        .eq('uuid', user.id)
        .single();

      if (userError || userData.position !== 'head') {
        setError('Only department heads can approve or reject files');
        return;
      }

      const userDepartmentId = userData.d_uuid;

      // Update the file_department record
      const { error: updateError } = await supabase
        .from('file_department')
        .update({ 
          is_approved: action === 'accept' ? 'approved' : 'rejected'
        })
        .eq('f_uuid', fileId)
        .eq('d_uuid', userDepartmentId);

      if (updateError) {
        setError(`Failed to ${action} file: ${updateError.message}`);
        return;
      }

      // Update the notification to mark it as processed
      const { error: notificationError } = await supabase
        .from('notifications')
        .update({ 
          is_seen: true,
          is_sent: action === 'accept' ? true : false
        })
        .eq('notif_id', notificationId);

      if (notificationError) {
      }

      // If approved, create notifications for all department members
      if (action === 'accept') {        
        // Get all users in the department (excluding the head who approved)
        const { data: allDeptUsers, error: usersError } = await supabase
          .from('users')
          .select('uuid, name, position')
          .eq('d_uuid', userDepartmentId);

        
        if (!usersError && allDeptUsers && allDeptUsers.length > 0) {
          const staffMembers = allDeptUsers.filter(u => u.uuid !== user.id);
          
          for (const staff of staffMembers) {
            
            // Delete any existing notifications for this file/user combination
            await supabase
              .from('notifications')
              .delete()
              .eq('f_uuid', fileId)
              .eq('uuid', staff.uuid);
            
            // Create fresh notification
            const { error: createError } = await supabase
              .from('notifications')
              .insert({
                uuid: staff.uuid,
                f_uuid: fileId,
                is_seen: false,
                is_sent: true,
                created_at: new Date().toISOString()
              });
            
            
          }
        }
        
        // Broadcast approval to all connected clients
        const { error: broadcastError } = await supabase
          .channel('file-approvals')
          .send({
            type: 'broadcast',
            event: 'file_approved',
            payload: { 
              file_id: fileId, 
              department_id: userDepartmentId 
            }
          });
        
        if (broadcastError) {
        }
        
        // Also trigger ensure function multiple times for broader coverage
        setTimeout(() => {
          ensureTodaysNotifications();
        }, 500);
        
        setTimeout(() => {
          ensureTodaysNotifications();
          fetchNotifications();
        }, 2000);
      }

      // Refresh notifications
      fetchNotifications();
      
    } catch (err) {
      setError(`Error ${action}ing file: ${err.message}`);
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Function to ensure notifications exist for today's files.
  // Important: Keep side-effects out of the fetch loop to avoid realtime feedback loops.
  const ensureTodaysNotifications = async () => {
    if (!user?.id) return;

    try {
      // Get user's department and position
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('d_uuid, position')
        .eq('uuid', user.id)
        .single();

      if (userError || !userData?.d_uuid) return;

      const userDepartmentId = userData.d_uuid;
      const isHead = userData.position === 'head';

      // Get today's start in ISO format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Get files from user's department created today
      // These are always visible to department members
      const { data: todayInternalFiles } = await supabase
        .from('file')
        .select(`
          f_uuid, 
          created_at
        `)
        .eq('d_uuid', userDepartmentId)
        .gte('created_at', todayStr);

      // For department heads: Get pending approval notifications for files from other departments
      if (isHead) {
        const { data: pendingFiles } = await supabase
          .from('file_department')
          .select(`
            f_uuid,
            is_approved,
            file:f_uuid(f_uuid, d_uuid, f_name)
          `)
          .eq('d_uuid', userDepartmentId)
          .is('is_approved', null)
          .gte('created_at', todayStr);

        // Create approval notifications for department head
        for (const fileRel of pendingFiles || []) {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('f_uuid', fileRel.f_uuid)
            .eq('uuid', user.id)
            .is('is_sent', null);

          if (count === 0) {
            await supabase
              .from('notifications')
              .insert({
                uuid: user.id,
                f_uuid: fileRel.f_uuid,
                is_seen: false,
                is_sent: null,
                created_at: new Date().toISOString()
              });
          }
        }
      }

      // For regular staff: Get approved files from other departments (last 4 days to catch recent approvals)
      if (!isHead) {
        const fourDaysAgo = new Date();
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        const fourDaysAgoStr = fourDaysAgo.toISOString();
        
        const { data: approvedExternalFiles } = await supabase
          .from('file_department')
          .select(`
            f_uuid,
            created_at
          `)
          .eq('d_uuid', userDepartmentId)
          .eq('is_approved', 'approved')
          .gte('created_at', fourDaysAgoStr);


        // Combine with internal files
        const allVisibleFiles = [
          ...(todayInternalFiles || []).map(f => ({ f_uuid: f.f_uuid })),
          ...(approvedExternalFiles || []).map(f => ({ f_uuid: f.f_uuid }))
        ];


        // Create notifications for visible files
        for (const file of allVisibleFiles) {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('f_uuid', file.f_uuid)
            .eq('uuid', user.id)
            .eq('is_sent', true);

          if (count === 0) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                uuid: user.id,
                f_uuid: file.f_uuid,
                is_seen: false,
                is_sent: true,
                created_at: new Date().toISOString()
              });
            
            if (insertError) {
            }
          } else {
            const { error: updateError } = await supabase
              .from('notifications')
              .update({ is_seen: false })
              .eq('f_uuid', file.f_uuid)
              .eq('uuid', user.id)
              .eq('is_seen', true)
              .eq('is_sent', true);
            
            if (updateError) {
            }
          }
        }
      }

      // For department heads: Also handle internal files
      if (isHead) {
        for (const file of todayInternalFiles || []) {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('f_uuid', file.f_uuid)
            .eq('uuid', user.id)
            .eq('is_sent', true);

          if (count === 0) {
            await supabase
              .from('notifications')
              .insert({
                uuid: user.id,
                f_uuid: file.f_uuid,
                is_seen: false,
                is_sent: true,
                created_at: new Date().toISOString()
              });
          }
        }
      }
    } catch (err) {
    }
  };

  // Fetch notifications function
  const fetchNotifications = async () => {
    if (!user?.id) {
      setItems([]);
      updateNotificationCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user's department
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('d_uuid, position')
        .eq('uuid', user.id)
        .single();
      
      if (userError) {
        setError(`User profile error: ${userError.message}`);
        updateNotificationCount(0);
        setLoading(false);
        return;
      }

      const userDepartmentId = userData?.d_uuid;
      const isHead = userData?.position === 'head';
      
      // Calculate date 4 days ago
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      fourDaysAgo.setHours(0, 0, 0, 0);
      const fourDaysAgoStr = fourDaysAgo.toISOString();
      
      // Different queries based on user role
      let notificationsQuery;
      
      if (isHead) {
        // Department heads see both regular notifications and pending approvals
        notificationsQuery = supabase
          .from('notifications')
          .select('notif_id, f_uuid, is_seen, is_sent, created_at')
          .eq('uuid', user.id)
          .eq('is_seen', false)
          .gte('created_at', fourDaysAgoStr)
          .order('created_at', { ascending: false });
      } else {
        // Regular staff only see approved notifications
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
      
      
      if (error) {
        setError(`Database error: ${error.message}`);
        updateNotificationCount(0);
        setLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        setItems([]);
        updateNotificationCount(0);
        setLoading(false);
        return;
      }

      // Get file details with department information
      const fileIds = data.map(n => n.f_uuid);
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
      
      if (fileError) {
        setError(`File data error: ${fileError.message}`);
        updateNotificationCount(0);
        setLoading(false);
        return;
      }
      
      // Create a map for quick lookup
      const fileMap = {};
      (fileData || []).forEach(file => {
        fileMap[file.f_uuid] = file;
      });
      
     
      
      // Deduplicate notifications so only the latest per file is shown
      const sortedByNewest = (data || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const seenFiles = new Set();
      const latestPerFile = [];
      for (const n of sortedByNewest) {
        if (!seenFiles.has(n.f_uuid)) {
          seenFiles.add(n.f_uuid);
          latestPerFile.push(n);
        }
      }

      // Map notifications to include file details and approval status
      const notificationItems = latestPerFile
        .filter(notification => {
          const file = fileMap[notification.f_uuid];
          
          
          if (!file) return false;
          
          // Files from user's own department are always visible
          if (file.d_uuid === userDepartmentId) return true;
          
          // For pending approval notifications (is_sent = null), only show to heads
          if (notification.is_sent === null) {
            return isHead;
          }
          
          // For approved files (is_sent = true), show to all users
          if (notification.is_sent === true) {
            // If it's from same department, always show
            if (file.d_uuid === userDepartmentId) return true;
            
            // If it's from external department, check if it was shared and approved
            if (isHead) return true;
            
            // For staff, check if file was shared with their department and approved
            const sharedWithDept = file.file_department?.find(fd => 
              fd.d_uuid === userDepartmentId && fd.is_approved === 'approved'
            );
            
            return !!sharedWithDept;
          }
          
          return false;
        })
        .map(notification => {
          const file = fileMap[notification.f_uuid];
          const isFromSameDept = file.d_uuid === userDepartmentId;
          const isPendingApproval = notification.is_sent === null && !isFromSameDept;
          
          return {
            notif_id: notification.notif_id,
            f_uuid: notification.f_uuid,
            f_name: file.f_name || 'Unknown file',
            created_at: notification.created_at,
            file_created_at: file.created_at,
            dateGroup: formatDate(notification.created_at),
            fromSameDept: isFromSameDept,
            isPendingApproval: isPendingApproval,
            sourceDepartment: file.department?.d_name || 'Unknown Department',
            is_sent: notification.is_sent
          };
        });
      
      // Group by date for display
      const groups = {};
      notificationItems.forEach(item => {
        const group = item.dateGroup;
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
      });
      
      setDateGroups(groups);
      setItems(notificationItems);
      
      // Update the notification count in the context
      updateNotificationCount(notificationItems.length);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      updateNotificationCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time listeners
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `uuid=eq.${user?.id}` },
        () => {
          fetchNotifications();
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `uuid=eq.${user?.id}` },
        () => {
          fetchNotifications();
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'file_department' },
        (payload) => {
          // When a file is approved, refresh notifications and ensure coverage
          if (payload.new?.is_approved === 'approved') {
            setTimeout(() => {
              ensureTodaysNotifications();
              fetchNotifications();
            }, 500);
          } else {
            fetchNotifications();
          }
        }
      )
      .on('broadcast', 
        { event: 'file_approved' },
        (payload) => {
          // When any file is approved, refresh notifications for all users
          setTimeout(() => {
            ensureTodaysNotifications();
            fetchNotifications();
          }, 1000);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Initialize notification count when component mounts
  useEffect(() => {
    updateNotificationCount(items.length);
  }, [items.length, updateNotificationCount]);

  // Run the ensure step only once per mount/user change to avoid realtime feedback loops
  useEffect(() => {
    if (!user?.id) return;
    ensureTodaysNotifications();
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
                    key={`${file.f_uuid}-${file.created_at}`} 
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`${file.isPendingApproval ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'} rounded-lg p-2.5 flex-shrink-0`}>
                        {file.isPendingApproval ? (
                          <BuildingOfficeIcon className="h-5 w-5" />
                        ) : (
                          <DocumentTextIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-900 font-medium truncate">
                            {file.f_name || "Unnamed File"}
                          </p>
                          {file.isPendingApproval ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Approval
                            </span>
                          ) : file.fromSameDept ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                              Internal
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              External (Approved)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>
                            Added at {formatTime(file.file_created_at || file.created_at)}
                          </span>
                          {file.isPendingApproval && (
                            <>
                              <span>•</span>
                              <span>From {file.sourceDepartment}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {file.isPendingApproval ? (
                        <>
                          <button
                            onClick={() => handleApprovalAction(file.f_uuid, 'accept', file.notif_id)}
                            disabled={processingActions.has(`${file.f_uuid}-accept`)}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            {processingActions.has(`${file.f_uuid}-accept`) ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckIcon className="h-4 w-4" />
                            )}
                            <span className="ml-1">Accept</span>
                          </button>
                          <button
                            onClick={() => handleApprovalAction(file.f_uuid, 'reject', file.notif_id)}
                            disabled={processingActions.has(`${file.f_uuid}-reject`)}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            {processingActions.has(`${file.f_uuid}-reject`) ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <XMarkIcon className="h-4 w-4" />
                            )}
                            <span className="ml-1">Reject</span>
                          </button>
                        </>
                      ) : (
                        <a
                          href={`/file/${file.f_uuid}?from=notification`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          View
                        </a>
                      )}
                    </div>
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
import { supabase } from '../supabaseClient';

/**
 * Mark a notification as seen for a specific file and user
 */
export const markNotificationAsSeen = async (fileUuid, userId) => {
  if (!fileUuid || !userId) {
    console.error("Missing required parameters:", { fileUuid, userId });
    return false;
  }
  
  try {
    console.log(`Marking notification as seen for file ${fileUuid} and user ${userId}`);
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_seen: true })
      .match({ 
        f_uuid: fileUuid, 
        uuid: userId,
        is_seen: false
      });

    if (error) {
      console.error("Error marking notification as seen:", error);
      return false;
    }
    
    return true; // Just return success boolean
  } catch (err) {
    console.error("Exception in markNotificationAsSeen:", err);
    return false;
  }
};

/**
 * Process notifications for a new document - can be called after API upload success
 * if we need to maintain the notifications feature with Supabase while using the API for uploads
 * @param {Object} fileData - File data from API response, containing f_uuid and other details
 * @param {Array<string>} departmentUuids - Array of department UUIDs
 * @param {string} userId - User ID of the uploader (optional)
 * @returns {Promise} - Result of notification processing
 */
export const processDocumentNotifications = async (fileData, departmentUuids, userId) => {
  try {
    if (!fileData || !fileData.f_uuid) {
      console.error("Invalid file data for notifications", fileData);
      return { success: false, error: new Error("Invalid file data") };
    }

    console.log(`Creating notifications for file ${fileData.f_name || fileData.f_uuid}`);
    
    // Get all users from the selected departments
    const { data: usersInDepartments, error: usersError } = await supabase
      .from("users")
      .select("uuid")
      .in("d_uuid", departmentUuids);

    if (usersError) {
      console.error("Error fetching users for departments:", usersError);
      return { success: false, error: usersError };
    }

    // If we found users, create notifications for them
    if (usersInDepartments && usersInDepartments.length > 0) {
      // Filter out the uploader if userId is provided (they'll get a notification from the backend)
      const usersToNotify = userId 
        ? usersInDepartments.filter(u => u.uuid !== userId)
        : usersInDepartments;
        
      if (usersToNotify.length === 0) {
        console.log("No users to notify (other than the uploader)");
        return { success: true, count: 0 };
      }
      
      const notificationRows = usersToNotify.map(u => ({
        uuid: u.uuid,
        f_uuid: fileData.f_uuid,
        is_seen: false,
        created_at: new Date().toISOString(),
      }));

      console.log(`Inserting ${notificationRows.length} notifications`);
      
      // Insert the notifications into the notifications table
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notificationRows);
        
      if (notificationError) {
        console.error("Error inserting notifications:", notificationError);
        return { success: false, error: notificationError };
      }
      
      console.log(`Successfully inserted ${notificationRows.length} notifications`);
      return { success: true, count: notificationRows.length };
    }
    
    console.log("No users found in the departments");
    return { success: true, count: 0 };
  } catch (error) {
    console.error("Error processing notifications:", error);
    return { success: false, error };
  }
};
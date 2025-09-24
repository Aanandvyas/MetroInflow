import { supabase } from '../supabaseClient';

export const markNotificationAsSeen = async (fileUuid, userId) => {
  if (!fileUuid || !userId) {
    console.error("Missing required parameters:", { fileUuid, userId });
    return false;
  }
  
  try {
    
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
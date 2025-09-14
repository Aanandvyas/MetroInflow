import { supabase } from '../supabaseClient';

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
      })
      .select();
    
    if (error) {
      console.error("Error marking notification as seen:", error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error("Exception in markNotificationAsSeen:", err);
    return false;
  }
};
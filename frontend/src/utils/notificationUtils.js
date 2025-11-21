import { supabase } from '../supabaseClient';

export const markNotificationAsSeen = async (fileUuid, userId) => {
  if (!fileUuid || !userId) {
    return false;
  }
  
  try {
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_seen: true })
      .match({ 
        f_uuid: fileUuid, 
        uuid: userId,
        is_seen: false
      });

    if (error) {
      return false;
    }
    
    return true; // Just return success boolean
  } catch (err) {
    return false;
  }
};
import { supabase } from '@/integrations/supabase/client';

export const logActivity = async (
  userId: string,
  actionType: string,
  details?: any
) => {
  try {
    // Call the log-activity edge function to bypass RLS
    await supabase.functions.invoke('log-activity', {
      body: {
        actionType,
        details
      }
    });
  } catch (error) {
    // Silently fail - don't block user actions if logging fails
    console.error('Activity logging failed:', error);
  }
};

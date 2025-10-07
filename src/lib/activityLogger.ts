import { logUserActivity } from './adminService';

export const logActivity = async (
  userId: string,
  actionType: string,
  details?: any
) => {
  try {
    // Get IP and user agent from browser
    const userAgent = navigator.userAgent;
    
    await logUserActivity(userId, actionType, details, undefined, userAgent);
  } catch (error) {
    // Silently fail - don't block user actions if logging fails
    console.error('Activity logging failed:', error);
  }
};

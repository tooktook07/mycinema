import { logUserActivity } from './adminService';

export const logActivity = async (
  userId: string,
  actionType: string,
  details?: any
) => {
  try {
    // Get user agent from browser
    const userAgent = navigator.userAgent;
    
    // Note: IP address cannot be obtained client-side for security reasons.
    // If IP logging is required, implement it server-side in edge functions instead.
    await logUserActivity(userId, actionType, details, undefined, userAgent);
  } catch (error) {
    // Silently fail - don't block user actions if logging fails
    console.error('Activity logging failed:', error);
  }
};

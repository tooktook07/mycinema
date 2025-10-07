import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  user_id: string;
  id: string;
  theme: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  roles?: string[];
}

export interface UserFilters {
  search?: string;
  role?: string;
  subscription_tier?: string;
  subscription_status?: string;
}

export interface SubscriptionUpdate {
  subscription_tier?: 'free' | 'pro';
  subscription_status?: 'active' | 'inactive' | 'canceled';
  subscription_expires_at?: string | null;
}

export interface ActivityFilters {
  action_type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface Activity {
  id: string;
  user_id: string;
  action_type: string;
  action_details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  movies_rated: number;
  watchlist_count: number;
  subscription_tier: string;
  subscription_status: string;
  last_login_at: string | null;
  created_at: string;
}

export const getAllUsers = async (filters?: UserFilters): Promise<UserProfile[]> => {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.subscription_tier) {
    query = query.eq('subscription_tier', filters.subscription_tier);
  }
  if (filters?.subscription_status) {
    query = query.eq('subscription_status', filters.subscription_status);
  }

  const { data: profiles, error } = await query;
  if (error) throw error;

  // Get roles for each user
  const profilesWithRoles = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id);
      
      return {
        ...profile,
        roles: roles?.map(r => r.role) || []
      };
    })
  );
  
  return profilesWithRoles;
};

export const getUserById = async (userId: string): Promise<UserProfile> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  // Get roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  return {
    ...profile,
    roles: roles?.map(r => r.role) || []
  };
};

export const updateUserRole = async (
  userId: string,
  role: string,
  action: 'add' | 'remove'
): Promise<void> => {
  if (action === 'add') {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: role as any });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role as any);
    if (error) throw error;
  }
};

export const updateUserSubscription = async (
  userId: string,
  subscription: SubscriptionUpdate
): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update(subscription)
    .eq('user_id', userId);

  if (error) throw error;
};

export const logUserActivity = async (
  userId: string,
  actionType: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const { error } = await supabase
    .from('user_activity_logs')
    .insert({
      user_id: userId,
      action_type: actionType,
      action_details: details,
      ip_address: ipAddress,
      user_agent: userAgent
    });

  if (error) {
    console.error('Failed to log activity:', error);
  }
};

export const getUserActivityLogs = async (
  userId: string,
  filters?: ActivityFilters
): Promise<Activity[]> => {
  let query = supabase
    .from('user_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.action_type) {
    query = query.eq('action_type', filters.action_type);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

export const getAllActivityLogs = async (filters?: ActivityFilters): Promise<Activity[]> => {
  let query = supabase
    .from('user_activity_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.action_type) {
    query = query.eq('action_type', filters.action_type);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const { data, error } = await supabase.rpc('get_user_stats', {
    p_user_id: userId
  });

  if (error) throw error;
  return data as any as UserStats;
};

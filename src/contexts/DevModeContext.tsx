import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

type DevModeType = 'visitor' | 'user' | 'admin' | 'off';

interface DevModeContextType {
  devMode: DevModeType;
  setDevMode: (mode: DevModeType) => void;
  effectiveUser: User | null;
  effectiveIsAdmin: boolean;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export const DevModeProvider = ({ children }: { children: ReactNode }) => {
  const [devMode, setDevMode] = useState<DevModeType>(() => {
    // Disable dev mode in production builds
    if (import.meta.env.PROD) {
      return 'off';
    }
    const saved = localStorage.getItem('dev-mode');
    return (saved as DevModeType) || 'off';
  });

  const { user: realUser, isAdmin: realIsAdmin } = useAuth();

  useEffect(() => {
    // Only allow dev mode changes in development
    if (!import.meta.env.PROD) {
      localStorage.setItem('dev-mode', devMode);
    }
  }, [devMode]);

  // Mock user for dev mode
  const mockUser: User = {
    id: 'dev-user-id',
    email: 'dev@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;

  // Determine effective user and admin status based on dev mode
  // In production, always use real auth state
  const effectiveUser = import.meta.env.PROD ? realUser :
    devMode === 'off' ? realUser :
    devMode === 'visitor' ? null :
    devMode === 'user' ? (realUser || mockUser) :
    devMode === 'admin' ? (realUser || mockUser) :
    null;

  const effectiveIsAdmin = import.meta.env.PROD ? realIsAdmin :
    devMode === 'off' ? realIsAdmin :
    devMode === 'admin' ? true :
    false;

  return (
    <DevModeContext.Provider value={{ devMode, setDevMode, effectiveUser, effectiveIsAdmin }}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
};

// Hook to get effective auth state (respects dev mode)
export const useEffectiveAuth = () => {
  const { user: realUser, isAdmin: realIsAdmin, ...authMethods } = useAuth();
  const devModeContext = useContext(DevModeContext);

  if (!devModeContext) {
    return { user: realUser, isAdmin: realIsAdmin, ...authMethods };
  }

  const { effectiveUser, effectiveIsAdmin } = devModeContext;
  return { user: effectiveUser, isAdmin: effectiveIsAdmin, ...authMethods };
};

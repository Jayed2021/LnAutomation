import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, User, UserRole } from '../lib/supabase';
import {
  getModuleAccess,
  canDeleteOrders as _canDeleteOrders,
  canDoWarehouseActions as _canDoWarehouseActions,
  canDoCSActions as _canDoCSActions,
  canEditOrderSource as _canEditOrderSource,
  canEditCourierPayment as _canEditCourierPayment,
  canViewDetailedReports as _canViewDetailedReports,
} from '../lib/permissions';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  canSeeCosts: boolean;
  hasModuleAccess: (module: string) => boolean;
  canDeleteOrders: boolean;
  canDoWarehouseActions: boolean;
  canDoCSActions: boolean;
  canEditOrderSource: boolean;
  canEditCourierPayment: boolean;
  canViewDetailedReports: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('erp_user_id');
    if (storedUserId) {
      loadUser(storedUserId);
    } else {
      setLoading(false);
    }
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const loadUser = async (userId: string, attempt = 1) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        if (attempt < 3) {
          retryTimeoutRef.current = setTimeout(() => loadUser(userId, attempt + 1), 1500 * attempt);
          return;
        }
        console.error('Error loading user after retries:', error);
        setLoading(false);
        return;
      }

      if (data === null) {
        localStorage.removeItem('erp_user_id');
        setUser(null);
      } else {
        setUser(data);
      }
      setLoading(false);
    } catch (err) {
      if (attempt < 3) {
        retryTimeoutRef.current = setTimeout(() => loadUser(userId, attempt + 1), 1500 * attempt);
        return;
      }
      console.error('Error loading user after retries:', err);
      setLoading(false);
    }
  };

  const role = user?.role as UserRole | undefined;
  const modulePerms = user?.module_permissions ?? {};

  const canSeeCosts = role === 'admin' || user?.can_see_costs === true;

  const hasModuleAccess = (module: string): boolean => {
    if (!user || !role) return false;
    return getModuleAccess(role, modulePerms, module);
  };

  const canDeleteOrders = role ? _canDeleteOrders(role) : false;
  const canDoWarehouseActions = role ? _canDoWarehouseActions(role, modulePerms) : false;
  const canDoCSActions = role ? _canDoCSActions(role, modulePerms) : false;
  const canEditOrderSource = role ? _canEditOrderSource(role, modulePerms) : false;
  const canEditCourierPayment = role ? _canEditCourierPayment(role, modulePerms) : false;
  const canViewDetailedReports = role ? _canViewDetailedReports(role, modulePerms) : false;

  return (
    <AuthContext.Provider value={{
      user, loading, setUser,
      canSeeCosts,
      hasModuleAccess,
      canDeleteOrders,
      canDoWarehouseActions,
      canDoCSActions,
      canEditOrderSource,
      canEditCourierPayment,
      canViewDetailedReports,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Authentication Context Provider
 */
import React, { createContext, useContext, useState, useEffect, useCallback, FC, ReactNode } from 'react';
import authAPI from '../services/authAPI';

export interface Permissions {
  is_admin: boolean;
  is_instructor: boolean;
  is_student: boolean;
  can_access_mlops: boolean;
  can_manage_users: boolean;
  can_create_evaluation: boolean;
  [key: string]: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  staff_id?: string;
  student_id?: string;
  is_approved?: boolean;
  must_change_password?: boolean;
  account_type?: 'user' | 'student';
  permissions: Permissions;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  permissions: Permissions | null;
  login: (credentials: any) => Promise<any>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<any>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  changePassword: (old: string, newP: string, confirmP: string) => Promise<any>;
  setCurrentUser: (userData: User | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      // First get CSRF token
      await authAPI.getCSRFToken();
      
      // Then check auth status
      const data = await authAPI.checkAuth();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
      setError(null);
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authAPI.login(credentials);
      setUser(data.user);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authAPI.register(userData);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    try {
      const updated = await authAPI.updateProfile(data);
      setUser(prev => (prev ? { ...prev, ...updated } : null));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      return await authAPI.changePassword(oldPassword, newPassword, confirmPassword);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.permissions?.is_admin || false,
    isInstructor: user?.permissions?.is_instructor || false,
    isStudent: user?.permissions?.is_student || false,
    permissions: user?.permissions || null,
    login,
    logout,
    register,
    checkAuth,
    updateProfile,
    changePassword,
    setCurrentUser: (userData) => setUser(userData),
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

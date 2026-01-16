/**
 * Authentication Context Provider
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authAPI from '../services/authAPI';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authAPI.login(credentials);
      setUser(data.user);
      return data;
    } catch (err) {
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

  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authAPI.register(userData);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const updated = await authAPI.updateProfile(data);
      setUser(prev => ({ ...prev, ...updated }));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword, confirmPassword) => {
    try {
      return await authAPI.changePassword(oldPassword, newPassword, confirmPassword);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.permissions?.is_admin || false,
    isInstructor: user?.permissions?.is_instructor || false,
    isStudent: user?.permissions?.is_student || false,
    permissions: user?.permissions || {},
    login,
    logout,
    register,
    checkAuth,
    updateProfile,
    changePassword,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

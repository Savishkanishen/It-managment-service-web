import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS, ROLES } from '../data/mockData';
import authService from '../services/authService';

const AuthContext = createContext(null);

function normalizeRole(role) {
  if (!role) return ROLES.TRAINEE;
  const r = role.toString().toLowerCase().replace(/[\s\-]+/g, '_');
  // Direct slug match
  if (r === 'super_admin') return ROLES.SUPER_ADMIN;
  if (r === 'it_admin') return ROLES.IT_ADMIN;
  if (r === 'trainee') return ROLES.TRAINEE;
  if (r === 'zoom_requester') return ROLES.ZOOM_REQUESTER;
  // Keyword / fuzzy match
  if (r.includes('super')) return ROLES.SUPER_ADMIN;
  if (r.includes('it_admin') || r.includes('itadmin')) return ROLES.IT_ADMIN;
  if (r === 'admin' || r === 'administrator' || r === 'it') return ROLES.IT_ADMIN;
  if (r.includes('zoom')) return ROLES.ZOOM_REQUESTER;
  if (r.includes('trainee') || r.includes('intern') || r.includes('staff')) return ROLES.TRAINEE;
  return r;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check local storage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('itsm_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        parsed.role = normalizeRole(parsed.role);
        setUser(parsed);
      } catch (e) {
        console.error('Failed to parse stored user data');
        localStorage.removeItem('itsm_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const userData = await authService.login(username, password);
      userData.role = normalizeRole(userData.role);
      setUser(userData);
      localStorage.setItem('itsm_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      console.warn('Backend login unavailable, checking offline mock accounts:', error.message);
      // Fallback offline authentication against mock data
      const mockMatch = USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (mockMatch && (password === 'password123' || password === 'admin@1234')) {
        const userData = {
          id: mockMatch.id,
          username: mockMatch.username,
          name: mockMatch.name,
          email: mockMatch.email,
          role: normalizeRole(mockMatch.role),
          division: mockMatch.division,
          active: mockMatch.active,
          avatar: mockMatch.avatar,
        };
        setUser(userData);
        localStorage.setItem('itsm_user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, error: error.message || 'Invalid credentials' };
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      if (data.success && data.user) {
        const newUser = data.user;
        newUser.role = normalizeRole(newUser.role);
        setUser(newUser);
        localStorage.setItem('itsm_user', JSON.stringify(newUser));
        return { success: true, user: newUser, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to create account' };
    } catch (error) {
      if (error.response?.data?.error) {
        return { success: false, error: error.response.data.error };
      }
      if (error.message && error.message.includes('Admin accounts cannot be self-registered')) {
        return { success: false, error: error.message };
      }

      console.warn('Network error during registration, saving to local state:', error.message);
      // Enforce admin restriction even in offline fallback
      const requestedRole = normalizeRole(userData.role);
      if (requestedRole === ROLES.SUPER_ADMIN || requestedRole === ROLES.IT_ADMIN) {
        return {
          success: false,
          error: 'Admin accounts cannot be self-registered. An IT Administrator must create this account via the IT Admin Dashboard.'
        };
      }

      // Fallback offline registration
      const targetUsername = (userData.username || '').trim();
      const targetEmail = (userData.email || '').trim().toLowerCase();

      const exists = USERS.some(
        u => u.username.toLowerCase() === targetUsername.toLowerCase() ||
          u.email.toLowerCase() === targetEmail
      );
      if (exists) {
        return { success: false, error: 'Username or email already exists.' };
      }

      const mockUser = {
        id: `U${Date.now().toString().slice(-4)}`,
        username: targetUsername,
        name: userData.name?.trim() || targetUsername,
        email: targetEmail,
        role: normalizeRole(userData.role || ROLES.TRAINEE),
        division: userData.division || 'IT Department',
        active: true,
        avatar: (userData.name || targetUsername).slice(0, 2).toUpperCase(),
      };

      USERS.push(mockUser);
      setUser(mockUser);
      localStorage.setItem('itsm_user', JSON.stringify(mockUser));
      return { success: true, user: mockUser, message: 'Account created successfully (Offline mode)' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('itsm_user');
  };

  return (
    <AuthContext.Provider value={{ user, currentUser: user, login, logout, register, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

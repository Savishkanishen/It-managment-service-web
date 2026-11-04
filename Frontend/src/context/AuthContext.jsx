import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS, ROLES } from '../data/mockData';

const AuthContext = createContext(null);

function normalizeRole(role) {
  if (!role) return ROLES.TRAINEE;
  const r = role.toString().toLowerCase().replace(/[\s-]+/g, '_');
  if (r.includes('super')) return ROLES.SUPER_ADMIN;
  if (r.includes('it_admin') || r === 'it') return ROLES.IT_ADMIN;
  if (r.includes('zoom')) return ROLES.ZOOM_REQUESTER;
  if (r.includes('trainee') || r.includes('intern')) return ROLES.TRAINEE;
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
        console.error("Failed to parse stored user data");
        localStorage.removeItem('itsm_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        userData.role = normalizeRole(userData.role);
        setUser(userData);
        localStorage.setItem('itsm_user', JSON.stringify(userData));
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Invalid credentials' };
      }
    } catch (error) {
      console.warn('Network error connecting to backend, checking local accounts:', error.message);
      // Fallback offline authentication against mock data if backend dev server is temporarily starting up
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
        return { success: true };
      }
      return { success: false, error: 'Cannot connect to backend server. Please verify backend is running on port 5000.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('itsm_user');
  };

  return (
    <AuthContext.Provider value={{ user, currentUser: user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
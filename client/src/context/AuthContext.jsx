import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { auth, signOut } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Firebase Auth State with Backend Database Session
  useEffect(() => {
    let unsubscribe = () => {};

    if (auth) {
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            // Sync with backend
            const res = await authAPI.login({
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              avatar: fbUser.photoURL,
              phone: fbUser.phoneNumber || null,
              uid: fbUser.uid
            });
            if (res.data.success) {
              setUser(res.data.data);
              localStorage.setItem('eventops_user', JSON.stringify(res.data.data));
            }
          } catch (e) {
            console.error('[AuthSync] Error syncing Firebase user:', e);
            setUser(null);
          }
        } else {
          // No active Firebase session
          localStorage.removeItem('eventops_user');
          setUser(null);
        }
        setLoading(false);
      });
    } else {
      const stored = localStorage.getItem('eventops_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Login handler
  const login = async (userData) => {
    try {
      const res = await authAPI.login(userData);
      if (res.data.success) {
        setUser(res.data.data);
        localStorage.setItem('eventops_user', JSON.stringify(res.data.data));
        return res.data.data;
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Firebase signOut note:', e);
    }
    setUser(null);
    localStorage.removeItem('eventops_user');
  };

  // Update user in state and localStorage
  const updateUser = (updatedData) => {
    setUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('eventops_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateUser,
      isCreator: user?.role === 'EVENT_CREATOR',
      isLeader: user?.role === 'TEAM_LEADER',
      isWorker: user?.role === 'WORKER'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged, Auth } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { initializeApp } from '@/services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Initialize app and create admin user
    initializeApp().catch(console.error);

    return unsubscribe;
  }, []);

  const login = async (username: string, password: string) => {
    // For admin login, use the hardcoded email mapping
    const adminEmail = 'megharaj@admin.com';
    const adminPassword = 'megharaj@123';
    
    if (username === 'megharaj' && password === adminPassword) {
      // Authenticate with Firebase
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null); // Explicitly clear user state
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const isAdmin = user?.email === 'megharaj@admin.com';

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
// ניהול לוגיקת משתמש - הרשמה התחברות התנתקות

import { createContext, useContext, useState, useEffect } from "react";
import {
  getProfile,
  login as apiLogin,
  signup as apiSignup,
} from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null); 
        setLoading(false);
        return;
      }
      try {
        const res = await getProfile();
        setUser(res.data);
      } catch (err) {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);  

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await apiLogin(email, password);
      localStorage.setItem("token", res.data.token);
      const profile = await getProfile();
      setUser(profile.data);
      return true;
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid credentials");
      return false;
    }
  };

  const signup = async (name, email, password) => {
    try {
      setError(null);
      await apiSignup(name, email, password);
      return await login(email, password);
    } catch (err) {
      console.error("Signup failed:", err);
      setError("Registration failed");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

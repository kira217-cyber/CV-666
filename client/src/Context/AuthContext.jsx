// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("tab1");

  // Global login modal state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [language, setLanguage] = useState(
    localStorage.getItem("sidebarLang") || "bn",
  );

  const [adminHomeControl, setAdminHomeControl] = useState(null);

  const fetchUser = async (userId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin?id=${userId}`,
      );

      if (!res.ok) throw new Error("Failed to fetch user");

      const data = await res.json();

      setUserId(data.user._id);

      return data.user;
    } catch (err) {
      console.error("Fetch user error:", err);
      return null;
    }
  };

  const refreshBalance = async () => {
    const storedUserId = localStorage.getItem("userId");

    if (!storedUserId) return;

    setIsBalanceLoading(true);

    try {
      const fetchedUser = await fetchUser(storedUserId);

      if (fetchedUser) {
        setBalance(fetchedUser.balance || 0);
      }
    } catch (err) {
      console.error("Balance refresh failed:", err);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const fetchAdminHomeControl = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_API}api/v1/admin/admin-home-control`,
      );

      if (res.data) {
        setAdminHomeControl(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin home control:", err);
      setAdminHomeControl(null);
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");

    const initialize = async () => {
      setLoading(true);

      await fetchAdminHomeControl();

      if (storedUserId) {
        const fetchedUser = await fetchUser(storedUserId);

        if (fetchedUser) {
          setUser(fetchedUser);
          setBalance(fetchedUser.balance || 0);
          localStorage.setItem("user", JSON.stringify(fetchedUser));
        } else {
          localStorage.removeItem("userId");
          localStorage.removeItem("user");
        }
      }

      setLoading(false);
    };

    initialize();
  }, []);

  const logout = () => {
    setUser(null);
    setUserId(null);
    setBalance(0);
    setIsInformationModalOpen(false);
    setInitialTab("tab1");
    setIsLoginModalOpen(false);

    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user_token");
    localStorage.removeItem("authToken");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,

        loading,
        logout,

        balance,
        setBalance,
        refreshBalance,
        isBalanceLoading,

        language,
        setLanguage,

        userId,
        setUserId,

        isInformationModalOpen,
        setIsInformationModalOpen,

        initialTab,
        setInitialTab,

        isLoginModalOpen,
        setIsLoginModalOpen,

        adminHomeControl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

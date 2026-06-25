"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: "admin" | "staff";
  businessRoles?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbInitialized: boolean | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Helper to fetch credentials
  const fetchWithCredentials = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: "include", 
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  };

  const checkAuth = async () => {
    try {
      // Check if DB is initialized
      const healthRes = await fetch("/api/health");
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setDbInitialized(healthData.db_initialized);

        if (!healthData.db_initialized) {
          setUser(null);
          setLoading(false);
          return;
        }
      }

      const res = await fetchWithCredentials("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          return;
        }
      }

      // If unauthorized, try to refresh token
      if (res.status === 401) {
        const refreshRes = await fetchWithCredentials("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          // Retry fetching user details
          const retryRes = await fetchWithCredentials("/api/auth/me");
          if (retryRes.ok) {
            const data = await retryRes.json();
            if (data.success) {
              setUser(data.user);
              return;
            }
          }
        }
      }

      setUser(null);
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Protect client routes
  useEffect(() => {
    if (loading) return;

    // If DB is not initialized, keep them on dashboard to run initialization
    if (dbInitialized === false) {
      if (pathname !== "/admin") {
        router.push("/admin");
      }
      return;
    }

    const isLoginPage = pathname === "/admin/login";

    if (!user) {
      if (!isLoginPage) {
        router.push("/admin/login");
      }
    } else {
      if (isLoginPage || pathname === "/admin") {
        if (user.role === "staff") {
          router.push("/admin/staff/attendance");
        } else {
          router.push("/admin");
        }
      }
    }
  }, [user, loading, pathname, router, dbInitialized]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetchWithCredentials("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setDbInitialized(true); // Since login works, DB is definitely initialized
        if (data.user.role === "staff") {
          router.push("/admin/staff/attendance");
        } else {
          router.push("/admin");
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || "Đăng nhập thất bại" };
      }
    } catch (err) {
      console.error("Login request error:", err);
      return { success: false, error: "Đã xảy ra lỗi kết nối" };
    }
  };

  const logout = async () => {
    try {
      await fetchWithCredentials("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      setUser(null);
      router.push("/admin/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, dbInitialized, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

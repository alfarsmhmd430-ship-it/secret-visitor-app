import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "secret_visitor_auth";
const SESSION_KEY = "secret_visitor_session";
// كلمة المرور الافتراضية
const DEFAULT_PASSWORD = "mans4523";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // تهيئة: التحقق من الجلسة المحفوظة وإعداد كلمة المرور الافتراضية
  useEffect(() => {
    const init = async () => {
      try {
        // إعداد كلمة المرور الافتراضية إذا لم تكن موجودة
        const stored = await AsyncStorage.getItem(AUTH_KEY);
        if (!stored) {
          await AsyncStorage.setItem(AUTH_KEY, DEFAULT_PASSWORD);
        }
        // التحقق من الجلسة
        const session = await AsyncStorage.getItem(SESSION_KEY);
        if (session === "active") {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const storedPassword = await AsyncStorage.getItem(AUTH_KEY);
      const correctPassword = storedPassword ?? DEFAULT_PASSWORD;
      if (password === correctPassword) {
        await AsyncStorage.setItem(SESSION_KEY, "active");
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: "كلمة المرور غير صحيحة" };
      }
    } catch (e) {
      return { success: false, error: "حدث خطأ، يرجى المحاولة مجدداً" };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const storedPassword = await AsyncStorage.getItem(AUTH_KEY);
      const correctPassword = storedPassword ?? DEFAULT_PASSWORD;
      if (oldPassword !== correctPassword) {
        return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
      }
      if (newPassword.length < 4) {
        return { success: false, error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" };
      }
      await AsyncStorage.setItem(AUTH_KEY, newPassword);
      return { success: true };
    } catch (e) {
      return { success: false, error: "حدث خطأ، يرجى المحاولة مجدداً" };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

"use client";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { AppState, ViewId } from "./types";
import { loadState, saveState } from "./store";
import { isSupabaseReady } from "./supabase";
import { fetchAllState, seedIfEmpty } from "./db";
import { syncToSupabase } from "./sync";

type Theme = "light" | "dark";
type DbStatus = "local" | "supabase" | "loading";

export type UserRole = "管理者" | "部門管理者" | "一般ユーザー";

interface AppContextValue {
  state: AppState;
  currentView: ViewId;
  setView: (view: ViewId) => void;
  updateState: (updater: (prev: AppState) => AppState) => void;
  theme: Theme;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  dbStatus: DbStatus;
  currentUser: string | null;
  login: (userId: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
  myRole: UserRole;
  can: (action: "admin" | "dept_admin" | "any") => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [currentView, setCurrentView] = useState<ViewId>("dashboard");
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>(isSupabaseReady() ? "loading" : "local");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("ow-theme") as Theme | null;
    const savedUser = localStorage.getItem("ow-current-user");
    if (savedTheme) setTheme(savedTheme);
    if (savedUser) setCurrentUser(savedUser);
    if (localStorage.getItem("ow-sidebar-collapsed") === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ow-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isSupabaseReady()) return;

    (async () => {
      try {
        await seedIfEmpty(state);
        const remote = await fetchAllState();
        setState((prev) => ({ ...prev, ...remote, currentUser: prev.currentUser }));
        setDbStatus("supabase");
      } catch (error) {
        console.error("[Supabase] fetch failed, using local state", error);
        setDbStatus("local");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((value) => (value === "light" ? "dark" : "light"));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((value) => {
      localStorage.setItem("ow-sidebar-collapsed", value ? "0" : "1");
      return !value;
    });
  }, []);

  const setView = useCallback((view: ViewId) => setCurrentView(view), []);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      syncToSupabase(prev, next);
      return next;
    });
  }, []);

  const login = useCallback((userId: string) => {
    setCurrentUser(userId);
    localStorage.setItem("ow-current-user", userId);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("ow-current-user");
    setCurrentView("dashboard");
  }, []);

  const myRole = (state.users.find((u) => u.id === currentUser)?.role ?? "一般ユーザー") as UserRole;

  const can = useCallback(
    (action: "admin" | "dept_admin" | "any") => {
      if (action === "any") return true;
      if (action === "admin") return myRole === "管理者";
      if (action === "dept_admin") return myRole === "管理者" || myRole === "部門管理者";
      return false;
    },
    [myRole],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        currentView,
        setView,
        updateState,
        theme,
        toggleTheme,
        sidebarCollapsed,
        toggleSidebar,
        dbStatus,
        currentUser,
        login,
        logout,
        isLoggedIn: currentUser !== null,
        myRole,
        can,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

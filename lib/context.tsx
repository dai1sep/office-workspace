"use client";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { AppState, ViewId } from "./types";
import { loadState, saveState, seedState } from "./store";
import { isSupabaseReady, supabase } from "./supabase";
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
  // Supabase Auth（本番）: メール+パスワードでのサインイン
  authMode: "supabase" | "local";
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  authUnlinked: boolean; // 認証は成功したが、社員データにメールが一致しない状態
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [currentView, setCurrentView] = useState<ViewId>("dashboard");
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>(isSupabaseReady() ? "loading" : "local");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authUnlinked, setAuthUnlinked] = useState(false);
  const authMode: "supabase" | "local" = isSupabaseReady() ? "supabase" : "local";

  useEffect(() => {
    const savedTheme = localStorage.getItem("ow-theme") as Theme | null;
    const savedUser = localStorage.getItem("ow-current-user");
    if (savedTheme) setTheme(savedTheme);
    // Supabaseモードでは認証セッションから復元するため、ローカル保存ユーザーは使わない
    if (savedUser && !isSupabaseReady()) setCurrentUser(savedUser);
    if (localStorage.getItem("ow-sidebar-collapsed") === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ow-theme", theme);
  }, [theme]);

  // Supabase Auth: セッション確立後にデータを投入・取得し、メール一致で currentUser を解決
  useEffect(() => {
    if (!supabase) return;

    async function handleSession(session: { user: { email?: string } } | null) {
      if (!session) {
        // 未ログイン（匿名）。ログイン画面を表示する。
        setCurrentUser(null);
        setAuthUnlinked(false);
        setDbStatus("supabase");
        return;
      }
      try {
        await seedIfEmpty(seedState); // 空なら初期データを投入（認証済のためRLSを通過）
        const remote = await fetchAllState();
        setState((prev) => ({ ...prev, ...remote }));
        const email = session.user.email?.toLowerCase() ?? "";
        const appUser = (remote.users ?? []).find((u) => u.email.toLowerCase() === email);
        if (appUser) {
          setCurrentUser(appUser.id);
          setAuthUnlinked(false);
        } else {
          // 認証は通ったが社員データにメールが無い
          setCurrentUser(null);
          setAuthUnlinked(true);
        }
        setDbStatus("supabase");
      } catch (error) {
        console.error("[Supabase] session load failed", error);
        setDbStatus("local");
      }
    }

    supabase.auth.getSession().then(({ data }) => handleSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
    return () => sub.subscription.unsubscribe();
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

  // ローカルモード（Supabase未設定）のログイン。ユーザー選択方式。
  const login = useCallback((userId: string) => {
    setCurrentUser(userId);
    localStorage.setItem("ow-current-user", userId);
  }, []);

  // Supabase Auth（本番）のサインイン。成功時は onAuthStateChange が currentUser を解決する。
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabaseが設定されていません" };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? error.message : null };
  }, []);

  const logout = useCallback(() => {
    if (supabase) {
      supabase.auth.signOut(); // onAuthStateChange で currentUser=null になる
    } else {
      setCurrentUser(null);
      localStorage.removeItem("ow-current-user");
    }
    setAuthUnlinked(false);
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
        authMode,
        signInWithEmail,
        authUnlinked,
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

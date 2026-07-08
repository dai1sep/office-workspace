"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useApp } from "@/lib/context";
import { ViewId } from "@/lib/types";
import { initials, pendingWorkflowCount, userName } from "@/lib/utils";
import { useIsMobile } from "@/lib/useIsMobile";

const NAV_ITEMS: { view: ViewId; icon: string; label: string; adminOnly?: boolean }[] = [
  { view: "dashboard", icon: "家", label: "ホーム" },
  { view: "search", icon: "検", label: "横断検索" },
  { view: "mail", icon: "封", label: "メール管理" },
  { view: "schedule", icon: "予", label: "スケジュール管理" },
  { view: "folder", icon: "個", label: "個人フォルダ" },
  { view: "bulletin", icon: "掲", label: "社内掲示板" },
  { view: "workflow", icon: "承", label: "ワークフロー" },
  { view: "todo", icon: "済", label: "ToDo管理" },
  { view: "messages", icon: "話", label: "メッセージ機能" },
  { view: "address", icon: "名", label: "アドレス帳" },
  { view: "files", icon: "書", label: "ファイル管理" },
  { view: "employees", icon: "員", label: "社員管理" },
  { view: "admin", icon: "管", label: "組織・権限管理", adminOnly: true },
  { view: "spaces", icon: "工", label: "工事スペース" },
  { view: "process", icon: "程", label: "工程管理" },
  { view: "knowledge", icon: "知", label: "ナレッジ" },
  { view: "canvas", icon: "板", label: "ホワイトボード" },
  { view: "impactmap", icon: "進", label: "進捗管理" },
  { view: "licenses", icon: "証", label: "資格・許可管理" },
  { view: "dailyreport", icon: "日", label: "工事日報" },
  { view: "safetydocs", icon: "盾", label: "安全書類" },
];

const BOTTOM_TABS: ViewId[] = ["dashboard", "todo", "schedule", "bulletin", "messages"];
const MOBILE_LABELS: Partial<Record<ViewId, string>> = {
  dashboard: "ホーム",
  todo: "ToDo",
  schedule: "予定",
  bulletin: "掲示",
  messages: "連絡",
};

export default function Sidebar() {
  const { state, currentView, setView, theme, toggleTheme, sidebarCollapsed, toggleSidebar, currentUser, can } = useApp();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const meId = currentUser ?? state.currentUser;
  const me = userName(state, meId);
  const meUser = state.users.find((u) => u.id === meId);
  const workflowPending = pendingWorkflowCount(state, meId);

  const renderMenu = (collapsed: boolean, onSelect?: () => void) => (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map((item) => {
        const locked = item.adminOnly && !can("admin");
        const badge = item.view === "workflow" ? workflowPending : 0;
        return (
          <motion.button
            key={item.view}
            className={currentView === item.view ? "active" : ""}
            disabled={locked}
            aria-label={badge > 0 ? `${item.label}（未処理${badge}件）` : item.label}
            title={collapsed ? item.label : undefined}
            onClick={() => {
              setView(item.view);
              onSelect?.();
            }}
            whileHover={{ x: collapsed ? 0 : 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {!collapsed && <b>{item.label}</b>}
            {!collapsed && locked && <small>管理者のみ</small>}
            {badge > 0 && <em className={collapsed ? "nav-badge nav-badge-dot" : "nav-badge"}>{collapsed ? "" : badge}</em>}
          </motion.button>
        );
      })}
    </nav>
  );

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div className="drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
              <motion.aside className="mobile-drawer" initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }} transition={{ duration: 0.22 }}>
                <div className="sidebar-head">
                  <strong>Office Workspace</strong>
                  <div>
                    <button className="icon-button" onClick={toggleTheme}>
                      {theme === "dark" ? "明" : "暗"}
                    </button>
                    <button className="icon-button" onClick={() => setDrawerOpen(false)}>
                      閉
                    </button>
                  </div>
                </div>
                <div className="sidebar-user">
                  <span className="avatar">{initials(me)}</span>
                  <div>
                    <strong>{me}</strong>
                    <small>{meUser?.dept}</small>
                  </div>
                </div>
                {renderMenu(false, () => setDrawerOpen(false))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <nav className="mobile-bottom-nav">
          {NAV_ITEMS.filter((item) => BOTTOM_TABS.includes(item.view)).map((item) => (
            <button key={item.view} className={currentView === item.view ? "active" : ""} onClick={() => setView(item.view)}>
              <span>{item.icon}</span>
              <b>{MOBILE_LABELS[item.view] ?? item.label}</b>
            </button>
          ))}
          <button onClick={() => setDrawerOpen(true)}>
            <span>開</span>
            <b>メニュー</b>
          </button>
        </nav>
      </>
    );
  }

  return (
    <motion.aside className="sidebar" animate={{ width: sidebarCollapsed ? 58 : 246 }} transition={{ duration: 0.22 }}>
      <div className="sidebar-head">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.strong initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Office Workspace
            </motion.strong>
          )}
        </AnimatePresence>
        <div>
          {!sidebarCollapsed && (
            <button className="icon-button" onClick={toggleTheme}>
              {theme === "dark" ? "明" : "暗"}
            </button>
          )}
          <button className="icon-button" onClick={toggleSidebar}>
            {sidebarCollapsed ? "開" : "閉"}
          </button>
        </div>
      </div>

      {!sidebarCollapsed && (
        <button className="command-hint" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}>
          <span>検</span>
          <b>検索・コマンド</b>
          <kbd>Ctrl K</kbd>
        </button>
      )}

      {renderMenu(sidebarCollapsed)}

      <div className="sidebar-user">
        <span className="avatar">{initials(me)}</span>
        {!sidebarCollapsed && (
          <div>
            <strong>{me}</strong>
            <small>{meUser?.dept}</small>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

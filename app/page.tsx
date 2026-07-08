"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ViewTransition from "@/components/ViewTransition";
import LoginScreen from "@/components/LoginScreen";
import NotificationBell from "@/components/NotificationBell";
import ProfileModal from "@/components/ProfileModal";
import Dashboard from "@/components/views/Dashboard";
import Workflow from "@/components/views/Workflow";
import TodoView from "@/components/views/Todo";
import BulletinView from "@/components/views/Bulletin";
import ScheduleView from "@/components/views/Schedule";
import MailView from "@/components/views/Mail";
import TimecardView from "@/components/views/Timecard";
import SpacesView from "@/components/views/Spaces";
import FilesView from "@/components/views/Files";
import AddressView from "@/components/views/Address";
import MessagesView from "@/components/views/Messages";
import FacilitiesView from "@/components/views/Facilities";
import AdminView from "@/components/views/Admin";
import KnowledgeView from "@/components/views/Knowledge";
import FolderView from "@/components/views/Folder";
import CanvasView from "@/components/views/Canvas";
import SearchView from "@/components/views/Search";
import LicensesView from "@/components/views/Licenses";
import DailyReportView from "@/components/views/DailyReport";
import ImpactMapView from "@/components/views/ImpactMap";
import SafetyDocsView from "@/components/views/SafetyDocs";
import EmployeesView from "@/components/views/Employees";
import ProcessView from "@/components/views/Process";
import Placeholder from "@/components/views/Placeholder";
import { useApp } from "@/lib/context";
import { ViewId } from "@/lib/types";
import { useIsMobile } from "@/lib/useIsMobile";

const VIEW_META: Record<ViewId, { icon: string; title: string; lead: string }> = {
  dashboard: { icon: "家", title: "ホーム", lead: "今日の予定、未処理、社内連絡をまとめて確認します。" },
  mail: { icon: "封", title: "メール管理", lead: "顧客・社内メールを案件やラベルと結び付けて管理します。" },
  schedule: { icon: "予", title: "スケジュール管理", lead: "個人、グループ、設備予約をまとめて確認します。" },
  folder: { icon: "個", title: "個人フォルダ", lead: "自分用のメモ、下書き、未整理資料を保管します。" },
  bulletin: { icon: "掲", title: "社内掲示板", lead: "全社、部門、案件ごとのお知らせを共有します。" },
  workflow: { icon: "承", title: "ワークフロー", lead: "申請、承認、差し戻し、履歴を管理します。" },
  todo: { icon: "済", title: "ToDo管理", lead: "担当者、期限、優先度、進捗を管理します。" },
  messages: { icon: "話", title: "メッセージ機能", lead: "個別・グループの会話を業務情報とつなぎます。" },
  address: { icon: "名", title: "アドレス帳", lead: "社員と取引先の連絡先を管理します。" },
  files: { icon: "書", title: "ファイル管理", lead: "共有ファイル、版、フォルダ、権限を管理します。" },
  facilities: { icon: "室", title: "設備予約", lead: "会議室、備品、車両の予約を確認します。" },
  timecard: { icon: "勤", title: "タイムカード", lead: "出退勤、休憩、残業見込みを確認します。" },
  admin: { icon: "管", title: "組織・権限管理", lead: "部署、役職、ロール、閲覧制御を設定します。" },
  spaces: { icon: "工", title: "工事スペース", lead: "工事現場ごとに配属メンバー・重機/機材の配置・稼働予定・点検をまとめて管理します。" },
  knowledge: { icon: "知", title: "ナレッジ", lead: "会議メモ、FAQ、文書を検索・整理します。" },
  canvas: { icon: "板", title: "ホワイトボード", lead: "業務フローや会議中のアイデアを付箋で整理します。" },
  search: { icon: "検", title: "横断検索", lead: "メール・掲示板・申請・予定・ファイルなどをまとめて検索します。" },
  licenses: { icon: "証", title: "資格・許可管理", lead: "建設業許可・社員資格の取得状況と有効期限を管理します。" },
  dailyreport: { icon: "日", title: "工事日報", lead: "工事打合簿・品質安全日誌を記録・提出・承認します。" },
  impactmap: { icon: "進", title: "進捗管理", lead: "ゴール→アクター→インパクト→デリバラブルの達成度を、地図とボードで見える化します。" },
  safetydocs: { icon: "盾", title: "安全書類", lead: "下請業者編成表・施工体制台帳などの提出様式を作成・出力します。" },
  employees: { icon: "員", title: "社員管理", lead: "社内メンバーの氏名・部署・役職・連絡先・在籍状況を管理します。" },
  process: { icon: "程", title: "工程管理", lead: "工事現場ごとの工程・作業をガントチャートで計画し、進捗を管理します。" },
};

function ViewContent({ view }: { view: ViewId }) {
  switch (view) {
    case "dashboard":
      return <Dashboard />;
    case "workflow":
      return <Workflow />;
    case "todo":
      return <TodoView />;
    case "bulletin":
      return <BulletinView />;
    case "schedule":
      return <ScheduleView />;
    case "mail":
      return <MailView />;
    case "timecard":
      return <TimecardView />;
    case "spaces":
      return <SpacesView />;
    case "files":
      return <FilesView />;
    case "address":
      return <AddressView />;
    case "messages":
      return <MessagesView />;
    case "facilities":
      return <FacilitiesView />;
    case "admin":
      return <AdminView />;
    case "knowledge":
      return <KnowledgeView />;
    case "folder":
      return <FolderView />;
    case "canvas":
      return <CanvasView />;
    case "search":
      return <SearchView />;
    case "licenses":
      return <LicensesView />;
    case "dailyreport":
      return <DailyReportView />;
    case "impactmap":
      return <ImpactMapView />;
    case "safetydocs":
      return <SafetyDocsView />;
    case "employees":
      return <EmployeesView />;
    case "process":
      return <ProcessView />;
    default:
      return <Placeholder view={view} />;
  }
}

function UserMenu() {
  const { state, currentUser, myRole, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const me = state.users.find((u) => u.id === currentUser);
  if (!me) return null;

  return (
    <>
      <div style={{ position: "relative" }}>
        <motion.button className="ghost-button" onClick={() => setOpen((value) => !value)} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
          <span className="avatar">{me.name[0]}</span>
          <span>{me.name}</span>
          <span className="muted-text">{myRole}</span>
        </motion.button>
        <AnimatePresence>
          {open && (
            <motion.div className="floating-menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} onMouseLeave={() => setOpen(false)}>
              <button
                onClick={() => {
                  setOpen(false);
                  setShowProfile(true);
                }}
              >
                プロフィール編集
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="danger-text"
              >
                ログアウト
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}

export default function Page() {
  const { currentView, dbStatus, isLoggedIn } = useApp();
  const isMobile = useIsMobile();
  const meta = VIEW_META[currentView];

  if (!isLoggedIn) return <LoginScreen />;

  return (
    <div className="app-shell">
      <Sidebar />
      <CommandPalette />
      <KeyboardShortcuts />
      <main className="app-main">
        <motion.header key={`${currentView}-header`} className="app-header" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <div className="header-title">
            {!isMobile && (
              <div className="breadcrumb">
                <span>Office Workspace / {meta.title}</span>
                <span className={`db-pill ${dbStatus}`}>{dbStatus === "supabase" ? "Web DB" : dbStatus === "loading" ? "接続中" : "ローカル保存"}</span>
              </div>
            )}
            <div className="title-row">
              <span className="view-icon">{meta.icon}</span>
              <div>
                <h1>{meta.title}</h1>
                {!isMobile && <p>{meta.lead}</p>}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <NotificationBell />
            {!isMobile && <UserMenu />}
          </div>
        </motion.header>
        <div className="main-content">
          <ViewTransition viewId={currentView}>
            <ViewContent view={currentView} />
          </ViewTransition>
        </div>
      </main>
    </div>
  );
}

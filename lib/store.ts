"use client";

import { AppState } from "./types";

const STORAGE_KEY = "office-workspace-state-v3";
export const TODAY = "2026-06-19";

const seedState: AppState = {
  currentUser: "u1",
  users: [
    { id: "u1", name: "佐藤", dept: "営業部", role: "管理者", email: "sato@example.local", ext: "1201" },
    { id: "u2", name: "田中", dept: "制作部", role: "部門管理者", email: "tanaka@example.local", ext: "1304" },
    { id: "u3", name: "山本", dept: "管理部", role: "管理者", email: "yamamoto@example.local", ext: "1102" },
    { id: "u4", name: "鈴木", dept: "営業部", role: "一般ユーザー", email: "suzuki@example.local", ext: "1215" },
    { id: "u5", name: "高橋", dept: "法務部", role: "一般ユーザー", email: "takahashi@example.local", ext: "1408" },
  ],
  schedules: [
    { id: "s1", title: "営業定例", date: TODAY, start: "09:30", end: "10:30", location: "会議室A", members: ["u1", "u3", "u4"], type: "meeting", detail: "進捗確認、承認事項、次回ToDoを整理します。" },
    { id: "s2", title: "採用サイト改善レビュー", date: TODAY, start: "11:00", end: "12:00", location: "オンライン", members: ["u2", "u4"], type: "meeting", detail: "原稿、構成、公開スケジュールの確認。" },
    { id: "s3", title: "顧客訪問", date: TODAY, start: "13:00", end: "14:00", location: "田町第2ビル", members: ["u1"], type: "away", detail: "見積確認。帰社予定は15:00。" },
    { id: "s4", title: "申請承認確認", date: TODAY, start: "15:30", end: "16:30", location: "管理部", members: ["u1", "u3"], type: "approval", detail: "稟議、交通費、休暇申請の確認。" },
    { id: "s5", title: "契約書確認", date: TODAY, start: "16:45", end: "17:15", location: "法務部", members: ["u5"], type: "work", detail: "契約書ドラフトの最終確認。" },
    { id: "s6", title: "制作進捗共有", date: TODAY, start: "17:30", end: "18:00", location: "制作部", members: ["u2", "u4"], type: "meeting", detail: "原稿、画像、公開準備の共有。" },
    { id: "s7", title: "直帰予定", date: TODAY, start: "18:15", end: "18:45", location: "顧客先", members: ["u3"], type: "away", detail: "メッセージで共有済み。" },
    { id: "s8", title: "資料レビュー", date: "2026-06-20", start: "10:00", end: "11:00", location: "会議室B", members: ["u1", "u2"], type: "work", detail: "提案資料の確認。" },
    { id: "s9", title: "月次報告準備", date: "2026-06-21", start: "14:00", end: "15:00", location: "管理部", members: ["u3"], type: "work", detail: "月次報告の下書きを作成。" },
  ],
  bulletins: [
    { id: "b1", scope: "全社", category: "全社連絡", title: "夏季休暇の運用について", author: "人事部", comments: 3, date: TODAY, publishAt: TODAY, finishAt: "2026-07-31", body: "夏季休暇の申請期限と代理承認者の設定を確認してください。", pinned: true, important: true, read: false, allowComments: true, allowReactions: true, reactionLabel: "確認しました", reactions: ["u1", "u2", "u3"], commentsList: [] },
    { id: "b2", scope: "営業部", category: "部門連絡", title: "6月キャンペーン共有", author: "営業企画", comments: 2, date: TODAY, publishAt: TODAY, finishAt: "2026-06-30", body: "キャンペーン資料をファイル管理へ格納しました。", pinned: false, important: false, read: false, allowComments: true, allowReactions: true, reactionLabel: "了解です", reactions: ["u1", "u4"], commentsList: [] },
    { id: "b3", scope: "総務", category: "設備・総務", title: "会議室Bの設備点検", author: "総務部", comments: 1, date: "2026-06-20", publishAt: "2026-06-18", finishAt: "2026-06-20", body: "6月20日 13:00-15:00 は設備点検のため会議室Bを利用できません。", pinned: false, important: true, read: true, allowComments: true, allowReactions: true, reactionLabel: "確認しました", reactions: ["u3"], commentsList: [] },
  ],
  workflows: [
    { id: "w1", type: "稟議", title: "営業支援ツール導入", applicant: "u1", dept: "営業部", date: TODAY, status: "承認待ち", amount: 450000, detail: "営業支援ツール導入費用", approvers: ["u3"], approved: [], rejected: false },
    { id: "w2", type: "経費", title: "交通費精算", applicant: "u3", dept: "管理部", date: TODAY, status: "確認中", amount: 12480, detail: "6月分交通費", approvers: ["u1"], approved: [], rejected: false },
    { id: "w3", type: "勤怠", title: "有給申請", applicant: "u2", dept: "制作部", date: "2026-06-21", status: "申請中", detail: "2026年6月21日 有給休暇", approvers: ["u3"], approved: [], rejected: false },
  ],
  todos: [
    { id: "t1", title: "営業定例の議事録確認", assignee: "u1", due: TODAY, priority: "高", status: "今日", project: "営業", detail: "承認事項と次回タスクを整理。" },
    { id: "t2", title: "採用ページ原稿修正", assignee: "u2", due: "2026-06-20", priority: "中", status: "今週", project: "採用サイト", detail: "レビュー内容を反映。" },
    { id: "t3", title: "ポータルFAQ更新", assignee: "u1", due: "2026-06-24", priority: "低", status: "予定", project: "社内ポータル", detail: "新機能のFAQを追加。" },
  ],
  messages: [
    { id: "msg1", from: "u2", to: ["u1"], subject: "資料確認お願いします", body: "午後のレビュー前に資料を確認してください。", date: TODAY, read: false },
  ],
  addresses: [
    { id: "a1", name: "佐藤", dept: "営業部", role: "部長", email: "sato@example.local", ext: "1201", mobile: "090-0000-0001" },
    { id: "a2", name: "田中", dept: "制作部", role: "主任", email: "tanaka@example.local", ext: "1304", mobile: "090-0000-0002" },
    { id: "a3", name: "山本", dept: "管理部", role: "課長", email: "yamamoto@example.local", ext: "1102", mobile: "090-0000-0003" },
  ],
  files: [
    { id: "f1", name: "営業資料_要件定義.pdf", folder: "営業", owner: "u1", date: TODAY, size: "2.4MB", version: 3 },
    { id: "f2", name: "採用サイト_原稿.docx", folder: "採用サイト", owner: "u2", date: "2026-06-17", size: "890KB", version: 8 },
  ],
  facilities: [
    { id: "fac1", name: "会議室A", capacity: 8, equipment: ["プロジェクター", "ホワイトボード"] },
    { id: "fac2", name: "会議室B", capacity: 4, equipment: ["モニター"] },
    { id: "fac3", name: "社用車", capacity: 4, equipment: ["ETC"] },
  ],
  reservations: [
    { id: "r1", facilityId: "fac1", title: "営業定例", date: TODAY, start: "09:30", end: "10:30", organizer: "u1", members: ["u1", "u3", "u4"] },
  ],
  timecards: [
    { id: "tc1", userId: "u1", date: TODAY, clockIn: "09:02", clockOut: undefined, breakStart: "12:00", breakEnd: "13:00" },
  ],
  mails: [
    { id: "mail1", subject: "見積確認のお願い", from: "田町第2ビル", to: ["u1"], date: TODAY, body: "先日ご相談した件について、見積書を送付ください。", folder: "受信", read: false, labels: ["営業"] },
    { id: "mail2", subject: "契約書ドラフト", from: "法務部", to: ["u1"], date: TODAY, body: "契約書ドラフトを共有します。ご確認ください。", folder: "受信", read: false, labels: ["法務"] },
  ],
  auditLogs: [
    { id: "log1", date: `${TODAY} 09:00`, user: "佐藤", action: "初期設定", target: "システム", detail: "デモデータを作成" },
  ],
  uiPrefs: {
    theme: "default",
    density: "standard",
    motion: "standard",
  },
};

export function loadState(): AppState {
  if (typeof window === "undefined") return structuredClone(seedState);
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedState);
  try {
    return { ...structuredClone(seedState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(seedState);
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): AppState {
  const fresh = structuredClone(seedState);
  saveState(fresh);
  return fresh;
}

export { seedState };

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
  workflowTemplates: [
    { id: "wt1", name: "稟議書", type: "稟議", description: "物品・契約・投資などの意思決定を伺う標準様式。", detailHint: "目的、内容、金額の根拠、効果を記載してください。", fields: ["amount", "projectNumber", "projectName"], defaultRoute: [
      { id: "wt1-r1", kind: "承認", role: "所属長", userIds: ["u1"] },
      { id: "wt1-r2", kind: "決裁", role: "管理責任者", userIds: ["u3"] },
      { id: "wt1-r3", kind: "回覧", role: "経理", userIds: ["u3"] },
    ] },
    { id: "wt2", name: "経費精算申請書", type: "経費精算", description: "立替経費の精算を申請する様式。", detailHint: "利用日、用途、金額の内訳を記載してください。", fields: ["amount", "receiveMethod", "projectNumber"], defaultRoute: [
      { id: "wt2-r1", kind: "承認", role: "所属長", userIds: ["u1"] },
      { id: "wt2-r2", kind: "確認", role: "経理", userIds: ["u3"] },
    ] },
    { id: "wt3", name: "現金支払申請書", type: "現金申請", description: "現金での支払・受取を申請する様式。", detailHint: "支払先、金額、支払理由を記載してください。", fields: ["amount", "cashRecipient", "receiveMethod"], defaultRoute: [
      { id: "wt3-r1", kind: "承認", role: "所属長", userIds: ["u1"] },
      { id: "wt3-r2", kind: "決裁", role: "管理責任者", userIds: ["u3"] },
    ] },
    { id: "wt4", name: "休暇申請書", type: "勤怠・休暇", description: "有給・特別休暇などを申請する様式。", detailHint: "休暇の種類と理由を記載してください。", fields: ["periodStart", "periodEnd", "proxyApplicant"], defaultRoute: [
      { id: "wt4-r1", kind: "承認", role: "所属長", userIds: ["u1"] },
    ] },
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
  constructionLicenses: [
    { id: "p1",  type: "土木工事業",        num: "大臣-般-04第123456号", kubun: "大臣・一般", acquired: "2021/10/01", expires: "2026/09/30", days: 97,   person: "田中 一郎", dept: "工務部", wf: "申請中", files: 2, status: "warn",    notes: "" },
    { id: "p2",  type: "建築工事業",        num: "大臣-般-04第123457号", kubun: "大臣・一般", acquired: "2021/10/01", expires: "2026/09/30", days: 97,   person: "田中 一郎", dept: "工務部", wf: "未起票", files: 1, status: "warn",    notes: "" },
    { id: "p3",  type: "電気工事業",        num: "知事-般-04第654321号", kubun: "知事・一般", acquired: "2023/04/15", expires: "2028/04/14", days: 663,  person: "佐藤 花子", dept: "設計部", wf: "未起票", files: 1, status: "ok",      notes: "" },
    { id: "p4",  type: "管工事業",          num: "知事-般-02第789012号", kubun: "知事・一般", acquired: "2021/07/01", expires: "2026/06/30", days: 9,    person: "鈴木 次郎", dept: "工務部", wf: "申請中", files: 0, status: "danger",  notes: "要対応アラート: 残9日" },
    { id: "p5",  type: "とび・土工工事業",  num: "知事-特-03第345678号", kubun: "知事・特定", acquired: "2022/01/20", expires: "2027/01/19", days: 578,  person: "高橋 三郎", dept: "現場部", wf: "未起票", files: 2, status: "ok",      notes: "" },
    { id: "p6",  type: "舗装工事業",        num: "知事-般-01第901234号", kubun: "知事・一般", acquired: "2021/03/10", expires: "2026/03/09", days: -103, person: "伊藤 四郎", dept: "現場部", wf: "申請中", files: 1, status: "expired", notes: "失効中 — 再申請ワークフロー起票が必要" },
    { id: "p7",  type: "鋼構造物工事業",    num: "知事-般-03第456789号", kubun: "知事・一般", acquired: "2022/06/15", expires: "2027/06/14", days: 358,  person: "田中 一郎", dept: "工務部", wf: "未起票", files: 1, status: "ok",      notes: "" },
    { id: "p8",  type: "塗装工事業",        num: "知事-般-04第234567号", kubun: "知事・一般", acquired: "2021/10/20", expires: "2026/08/10", days: 50,   person: "中村 五郎", dept: "現場部", wf: "未起票", files: 0, status: "warn",    notes: "" },
    { id: "p9",  type: "造園工事業",        num: "知事-般-05第678901号", kubun: "知事・一般", acquired: "2024/01/10", expires: "2029/01/09", days: 932,  person: "佐藤 花子", dept: "設計部", wf: "未起票", files: 1, status: "ok",      notes: "" },
    { id: "p10", type: "機械器具設置工事業", num: "大臣-特-04第112233号", kubun: "大臣・特定", acquired: "2022/09/01", expires: "2027/08/31", days: 435,  person: "田中 一郎", dept: "工務部", wf: "未起票", files: 3, status: "ok",      notes: "" },
    { id: "p11", type: "防水工事業",        num: "知事-般-02第334455号", kubun: "知事・一般", acquired: "2021/08/05", expires: "2026/07/15", days: 24,   person: "鈴木 次郎", dept: "工務部", wf: "未起票", files: 0, status: "danger",  notes: "要対応アラート: 残24日" },
    { id: "p12", type: "内装仕上工事業",    num: "知事-般-03第556677号", kubun: "知事・一般", acquired: "2024/06/01", expires: "2029/05/31", days: 1074, person: "高橋 三郎", dept: "現場部", wf: "未起票", files: 1, status: "ok",      notes: "" },
  ],
  employeeCertifications: [
    { id: "l1",  name: "一級施工管理技士（土木）",     category: "construction-management", categoryLabel: "施工管理系", person: "田中 一郎", dept: "工務部", acquired: "2018/03/15", expires: "2028/03/14", days: 997,  renewal: "講習更新",     status: "ok",      notify: true },
    { id: "l2",  name: "一級施工管理技士（建築）",     category: "construction-management", categoryLabel: "施工管理系", person: "佐藤 花子", dept: "設計部", acquired: "2019/06/20", expires: "2029/06/19", days: 1094, renewal: "講習更新",     status: "ok",      notify: true },
    { id: "l3",  name: "一級施工管理技士（土木）",     category: "construction-management", categoryLabel: "施工管理系", person: "鈴木 次郎", dept: "工務部", acquired: "2020/03/10", expires: "2027/09/30", days: 466,  renewal: "講習更新",     status: "ok",      notify: true },
    { id: "l4",  name: "二級施工管理技士（土木）",     category: "construction-management", categoryLabel: "施工管理系", person: "高橋 三郎", dept: "現場部", acquired: "2017/11/25", expires: "2027/11/24", days: 521,  renewal: "講習更新",     status: "ok",      notify: false },
    { id: "l5",  name: "一級施工管理技士（建築）",     category: "construction-management", categoryLabel: "施工管理系", person: "伊藤 四郎", dept: "現場部", acquired: "2021/06/15", expires: "2028/06/14", days: 724,  renewal: "講習更新",     status: "ok",      notify: true },
    { id: "l6",  name: "二級施工管理技士（造園）",     category: "construction-management", categoryLabel: "施工管理系", person: "中村 五郎", dept: "現場部", acquired: "2022/12/01", expires: "2029/11/30", days: 1257, renewal: "講習更新",     status: "ok",      notify: false },
    { id: "l7",  name: "一級建築士",                  category: "design",                  categoryLabel: "設計・建築系", person: "佐藤 花子", dept: "設計部", acquired: "2015/06/01", expires: "2026/08/31", days: 71,   renewal: "定期講習（5年）", status: "warn",   notify: true },
    { id: "l8",  name: "二級建築士",                  category: "design",                  categoryLabel: "設計・建築系", person: "山本 六郎", dept: "設計部", acquired: "2018/09/10", expires: "2028/09/09", days: 812,  renewal: "定期講習",     status: "ok",      notify: true },
    { id: "l9",  name: "宅地建物取引士",              category: "design",                  categoryLabel: "設計・建築系", person: "田中 一郎", dept: "工務部", acquired: "2014/03/20", expires: "2027/03/31", days: 283,  renewal: "法定講習",     status: "ok",      notify: false },
    { id: "l10", name: "建設業経理士 1級",            category: "design",                  categoryLabel: "設計・建築系", person: "佐藤 花子", dept: "設計部", acquired: "2020/03/15", expires: "2025/03/14", days: -99,  renewal: "再試験",       status: "expired", notify: true },
    { id: "l11", name: "建設業経理士 2級",            category: "design",                  categoryLabel: "設計・建築系", person: "山本 六郎", dept: "設計部", acquired: "2019/03/20", expires: null,         days: null, renewal: "更新不要",     status: "ok",      notify: false },
    { id: "l12", name: "危険物取扱者（甲種）",        category: "electrical",              categoryLabel: "電気・危険物系", person: "鈴木 次郎", dept: "工務部", acquired: "2020/11/20", expires: "2026/07/10", days: 19,   renewal: "保安講習",     status: "danger",  notify: true },
    { id: "l13", name: "第一種電気工事士",            category: "electrical",              categoryLabel: "電気・危険物系", person: "高橋 三郎", dept: "現場部", acquired: "2019/01/15", expires: "2029/01/14", days: 937,  renewal: "定期講習",     status: "ok",      notify: true },
    { id: "l14", name: "第二種電気工事士",            category: "electrical",              categoryLabel: "電気・危険物系", person: "中村 五郎", dept: "現場部", acquired: "2020/07/22", expires: null,         days: null, renewal: "更新不要",     status: "ok",      notify: false },
    { id: "l15", name: "電気主任技術者（三種）",      category: "electrical",              categoryLabel: "電気・危険物系", person: "田中 一郎", dept: "工務部", acquired: "2012/11/10", expires: null,         days: null, renewal: "更新不要",     status: "ok",      notify: false },
    { id: "l16", name: "危険物取扱者（乙4類）",       category: "electrical",              categoryLabel: "電気・危険物系", person: "木村 七郎", dept: "現場部", acquired: "2022/05/18", expires: "2027/05/17", days: 330,  renewal: "保安講習",     status: "ok",      notify: true },
    { id: "l17", name: "玉掛け技能講習",              category: "field",                   categoryLabel: "現場作業系", person: "高橋 三郎", dept: "現場部", acquired: "2019/08/05", expires: null,         days: null, renewal: "更新不要",     status: "ok",      notify: false },
    { id: "l18", name: "足場組立等作業主任者",        category: "field",                   categoryLabel: "現場作業系", person: "伊藤 四郎", dept: "現場部", acquired: "2017/09/12", expires: "2026/05/31", days: -21,  renewal: "再講習",       status: "expired", notify: true },
    { id: "l19", name: "クレーン・デリック運転士",    category: "field",                   categoryLabel: "現場作業系", person: "中村 五郎", dept: "現場部", acquired: "2021/05/18", expires: "2026/09/10", days: 81,   renewal: "定期点検",     status: "warn",    notify: true },
    { id: "l20", name: "職長・安全衛生責任者教育",    category: "field",                   categoryLabel: "現場作業系", person: "高橋 三郎", dept: "現場部", acquired: "2022/04/01", expires: "2027/03/31", days: 283,  renewal: "再教育（5年）", status: "ok",     notify: true },
    { id: "l21", name: "職長・安全衛生責任者教育",    category: "field",                   categoryLabel: "現場作業系", person: "田中 一郎", dept: "工務部", acquired: "2021/05/10", expires: "2026/05/09", days: -43,  renewal: "再教育（5年）", status: "expired", notify: true },
    { id: "l22", name: "玉掛け技能講習",              category: "field",                   categoryLabel: "現場作業系", person: "鈴木 次郎", dept: "工務部", acquired: "2018/03/22", expires: null,         days: null, renewal: "更新不要",     status: "ok",      notify: false },
    { id: "l23", name: "移動式クレーン運転士",        category: "field",                   categoryLabel: "現場作業系", person: "木村 七郎", dept: "現場部", acquired: "2022/09/14", expires: "2027/09/13", days: 449,  renewal: "定期点検",     status: "ok",      notify: true },
    { id: "l24", name: "高所作業車運転技能講習",      category: "field",                   categoryLabel: "現場作業系", person: "中村 五郎", dept: "現場部", acquired: "2020/10/30", expires: null,         days: null, renewal: "更新不要",     status: "ok",      notify: false },
    { id: "l25", name: "酸素欠乏危険作業主任者",      category: "field",                   categoryLabel: "現場作業系", person: "木村 七郎", dept: "現場部", acquired: "2023/03/05", expires: "2028/03/04", days: 622,  renewal: "再講習",       status: "ok",      notify: true },
    { id: "l26", name: "有機溶剤作業主任者",          category: "field",                   categoryLabel: "現場作業系", person: "伊藤 四郎", dept: "現場部", acquired: "2021/08/20", expires: "2031/08/19", days: 1885, renewal: "再講習",       status: "ok",      notify: false },
  ],
  knowledge: [
    { id: "k1", title: "社内申請ルール", body: "稟議・経費精算・休暇申請の提出期限と手順をまとめています。\n\n## 稟議\n- 金額5万円以上は部長承認が必要\n- 申請期日は支出予定日の5営業日前\n\n## 経費精算\n- 領収書は原本を経理部へ提出\n- 翌月末締め\n\n## 休暇\n- 有休は3営業日前までに申請", author: "u3", category: "申請・手続き", tags: ["申請", "稟議", "経費"], date: "2026-05-10", updatedAt: "2026-06-01", pinned: true },
    { id: "k2", title: "会議メモテンプレート", body: "## 会議情報\n- 日時:\n- 場所:\n- 参加者:\n\n## アジェンダ\n1. \n2. \n3. \n\n## 決定事項\n-\n\n## 次回アクション\n| 担当 | 内容 | 期限 |\n|---|---|---|\n|  |  |  |", author: "u1", category: "テンプレート", tags: ["テンプレート", "会議"], date: "2026-04-15", updatedAt: "2026-04-15", pinned: false },
    { id: "k3", title: "社内FAQ", body: "## よくある質問\n\n**Q: 有休残日数はどこで確認できますか？**\nA: タイムカード画面の月次集計から確認できます。\n\n**Q: 会議室の予約はどうすれば？**\nA: 設備予約画面から設備を選んで予約できます。\n\n**Q: ファイルをアップロードするには？**\nA: ファイル管理画面の「ファイル登録」ボタンから追加できます。", author: "u3", category: "FAQ", tags: ["FAQ", "ヘルプ"], date: "2026-03-01", updatedAt: "2026-06-10", pinned: false },
    { id: "k4", title: "セキュリティガイドライン", body: "## パスワードポリシー\n- 8文字以上、英数字混在\n- 90日ごとに変更\n\n## 情報取り扱い\n- 社外持ち出しは申請が必要\n- USBメモリの使用は禁止\n\n## インシデント報告\n疑わしい事象はすぐに情報システム部へ報告してください。", author: "u3", category: "ルール・規程", tags: ["セキュリティ", "ルール"], date: "2026-01-20", updatedAt: "2026-05-15", pinned: true },
    { id: "k5", title: "新人オンボーディングガイド", body: "## 入社初日\n1. PCセットアップ\n2. 社内システムアカウント発行依頼\n3. 部署紹介\n\n## 1週間以内\n- 業務マニュアル閲覧\n- 担当業務のヒアリング\n\n## 1ヶ月以内\n- 各種申請フロー体験\n- 目標設定シート提出", author: "u1", category: "人事・総務", tags: ["オンボーディング", "新人"], date: "2026-02-01", updatedAt: "2026-04-01", pinned: false },
  ],
  workspaces: [
    { id: "ws1", name: "田辺邸新築工事", color: "#3f6b5b", memberIds: ["u2", "u4"], location: "大阪市住吉区", description: "木造2階建 延床120㎡", createdAt: "2026-06-01" },
    { id: "ws2", name: "山田ビル改修工事", color: "#356c8a", memberIds: ["u5"], location: "神戸市中央区", description: "RC造4階 内装改修", createdAt: "2026-06-10" },
    { id: "ws3", name: "社内設備更新", color: "#a9622a", memberIds: [], location: "自社", description: "空調・電気設備", createdAt: "2026-06-15" },
  ],
  dailyReports: [
    {
      id: "dr1",
      workspaceId: "ws1",
      meetingDate: "2026-06-18",
      implementDate: "2026-06-19",
      weather: "晴れ",
      plannedWork: "1階床組工事・断熱材敷設",
      actualWork: "1階床組工事完了。断熱材は材料搬入のみ。",
      safetyItems: [
        { who: "田中", toWhom: "作業員全員", status: "朝礼にて安全確認済み" },
      ],
      attendees: [
        { name: "田中", jobType: "現場監督", present: true, startTime: "08:00", endTime: "17:00" },
        { name: "鈴木", jobType: "大工", present: true, startTime: "08:00", endTime: "17:00" },
      ],
      subcontractors: [
        { company: "○○工務店", jobType: "大工", workers: 3, startTime: "08:00", endTime: "17:00" },
      ],
      equipment: [
        { name: "コンプレッサー", count: 1, fuel: 15 },
      ],
      materials: [
        { name: "断熱材", type: "グラスウール", receivedToday: 50, receivedTotal: 50, usedToday: 0, usedTotal: 0, remaining: 50 },
      ],
      progressRate: 35,
      plannedDays: 90,
      remainingDays: 62,
      notes: "明日は断熱材敷設を優先する。",
      approvals: {},
      createdBy: "u2",
      createdAt: "2026-06-19",
      status: "submitted",
    },
  ],
  subcontractors: [
    { id: "sc1", companyName: "山田基礎工業株式会社", representative: "山田　太郎", address: "大阪市西区北堀江1-2-3", phone: "06-1234-5678", licenseCategory: "知事　一般", licenseNumber: "第1234号", licenseIssuedDate: "2023-04-01", jobType: "基礎工事", safetyOfficer: "山田　太郎", chiefEngineer: "山田　太郎" },
    { id: "sc2", companyName: "有限会社　高橋鉄筋", representative: "高橋　次郎", address: "神戸市中央区海岸通4-5", phone: "078-234-5678", licenseCategory: "知事　一般", licenseNumber: "第5678号", licenseIssuedDate: "2022-09-01", jobType: "鉄筋工事", safetyOfficer: "高橋　次郎", chiefEngineer: "高橋　次郎" },
    { id: "sc3", companyName: "株式会社　中村電設", representative: "中村　三郎", address: "大阪市住之江区南港北2-1", phone: "06-3456-7890", licenseCategory: "知事　特定", licenseNumber: "第9012号", licenseIssuedDate: "2024-01-15", jobType: "電気設備工事", safetyOfficer: "中村　三郎", chiefEngineer: "中村　三郎" },
  ],
  orgCharts: [
    {
      id: "oc1", workspaceId: "ws1", createdDate: "2026-06-01",
      entries: [
        { id: "oce1", tier: 1, slot: 1, jobType: "木造建方工事", companyName: "田辺建設株式会社", representative: "田辺　一郎", licenseNumber: "知事(般-4)第100号", safetyOfficer: "田中", chiefEngineer: "田中", registeredSkilledWorker: "", hasSpecialWork: false, periodStart: "2026-06-01", periodEnd: "2026-09-30" },
        { id: "oce2", tier: 2, slot: 1, subcontractorId: "sc1", jobType: "基礎工事", companyName: "山田基礎工業株式会社", representative: "山田　太郎", licenseNumber: "第1234号", safetyOfficer: "山田　太郎", chiefEngineer: "山田　太郎", workContent: "布基礎・べた基礎打設", hasSpecialWork: false, periodStart: "2026-06-01", periodEnd: "2026-06-20" },
        { id: "oce3", tier: 2, slot: 2, subcontractorId: "sc2", jobType: "鉄筋工事", companyName: "有限会社　高橋鉄筋", representative: "高橋　次郎", licenseNumber: "第5678号", safetyOfficer: "高橋　次郎", chiefEngineer: "高橋　次郎", workContent: "基礎配筋", hasSpecialWork: false, periodStart: "2026-06-05", periodEnd: "2026-06-18" },
      ],
      createdBy: "u2", createdAt: "2026-06-01",
    },
  ],
  systemLedgers: [
    {
      id: "sl1", workspaceId: "ws1", subcontractorId: "sc1", createdDate: "2026-06-01",
      primeCompanyName: "田辺建設株式会社", primeAddress: "大阪市住吉区長居1-1-1", primePhone: "06-9876-5432",
      primeRepresentative: "田辺　一郎", primeLicenseCategory: "知事　一般", primeLicenseNumber: "第100号", primeLicenseIssuedDate: "2020-04-01",
      primeWorkTitle: "田辺邸新築工事", primeOrdererNameAddress: "田辺　花子　大阪市住吉区長居1-1-1", primePeriodStart: "2026-06-01", primePeriodEnd: "2026-09-30", primeContractDate: "2026-05-20",
      primeInsurance: { health: "加入", pension: "加入", employment: "加入" },
      primeSiteAgent: "田中", primeChiefEngineerName: "田中", primeChiefEngineerFullTime: "専任", primeChiefEngineerQualification: "二級建築施工管理技士",
      primeSafetyOfficerName: "田中",
      subCompanyName: "山田基礎工業株式会社", subAddress: "大阪市西区北堀江1-2-3", subRepresentative: "山田　太郎",
      subLicenseCategory: "知事　一般", subLicenseNumber: "第1234号", subLicenseIssuedDate: "2023-04-01",
      subWorkTitle: "基礎工事一式", subPeriodStart: "2026-06-01", subPeriodEnd: "2026-06-20", subContractDate: "2026-05-25",
      subInsurance: { health: "加入", pension: "加入", employment: "加入" },
      subSiteAgent: "山田　太郎", subChiefEngineerName: "山田　太郎", subSafetyOfficerName: "山田　太郎",
      createdBy: "u2", createdAt: "2026-06-01",
    },
  ],
  fieldResources: [
    { id: "fr1", name: "バックホウ 0.45", type: "重機", status: "稼働可", maker: "コマツ PC138US" },
    { id: "fr2", name: "ミニユンボ 0.1", type: "重機", status: "稼働可", maker: "クボタ U-10" },
    { id: "fr3", name: "2tダンプ", type: "車両", status: "稼働可", maker: "いすゞ エルフ" },
    { id: "fr4", name: "発電機 2.5kVA", type: "機材", status: "整備中", notes: "オイル交換予定" },
    { id: "fr5", name: "プレートコンパクター", type: "機材", status: "稼働可" },
    { id: "fr6", name: "鈴木（オペレーター）", type: "人員", status: "稼働可" },
  ],
  resourceAllocations: [
    { id: "ra1", resourceId: "fr1", workspaceId: "ws1", date: TODAY },
    { id: "ra2", resourceId: "fr3", workspaceId: "ws1", date: TODAY },
    { id: "ra3", resourceId: "fr2", workspaceId: "ws2", date: TODAY },
  ],
  resourceInspections: [
    { id: "ri1", resourceId: "fr1", date: "2026-06-18", inspector: "田中", result: "良", note: "始業前点検 異常なし" },
    { id: "ri2", resourceId: "fr4", date: "2026-06-17", inspector: "鈴木", result: "要注意", note: "オイル量低下" },
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

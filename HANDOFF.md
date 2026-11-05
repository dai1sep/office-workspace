# HANDOFF

## 現在の状況（2026-11-06 更新・最新はここ）

- **場所**：ローカル `C:\Users\kasae\AI\office-workspace` ／ GitHub `dai1sep/office-workspace`（main）／ 共有コピー `\\192.168.1.6\share\個人\笠江\AI関連\software\office-workspace`
- **本番**：https://office-workspace.vercel.app（Vercel Hobby＋Supabase無料枠＋Supabase Auth メール認証。テスト運用中）
  - Supabase未設定時は自動でローカル(localStorage `office-workspace-state-v3`)モードにフォールバック
  - RLSは authenticated 限定（schema.sql 末尾のDOブロックで一括適用）。最初の管理者は seed の佐藤（`sato@example.local`）で作成
- **最終コミット**：`8e13574` PR#32「アプリ内SMTP設定画面」（2026-07-29）。作業ツリーはクリーン
- **直近の流れ**：#28 ファイル公開設定＋Supabase同期網羅 → #29 Supabase Auth＋RLS本番化 → #30 従業員登録の簡略化 → #31 メール送信フェーズ1（`/api/mail/send`＝nodemailerで自社SMTP送信） → #32 SMTP設定をアプリ画面から（`smtp_config` テーブル、service_roleのみアクセス可）
- **サーバー機能**：`app/api/mail/send/route.ts`（SMTP設定は DB の smtp_config 優先 → env `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` フォールバック）、`app/api/settings/smtp/route.ts`（管理者のみ、パスワードは返さない）、`lib/serverSupabase.ts`（service_role クライアント＋トークン→社員ロール検証）
- **未確認の1回きり準備（#32用）**：Vercel に `SUPABASE_SERVICE_ROLE_KEY` を登録（`NEXT_PUBLIC_` を付けない）＋ Supabase で `schema.sql` を再実行。済んでいるかは未確認
- **ハマりどころ**：
  - Vercel env `NEXT_PUBLIC_SUPABASE_URL` は土台URLのみ（`https://xxxx.supabase.co`）。`/rest/v1/` 等を付けるとログイン不可
  - Vercel無料機は型チェックで落ちるため `next.config.ts` で `typescript.ignoreBuildErrors:true`。型はローカル `tsc --noEmit` で担保。`eslint` キーは Next16 で使用不可
  - schema.sql は ALTER TABLE を必ず該当 CREATE TABLE の後に置く
- **次の候補（全Web完結構想）**：①メール受信（IMAP取得→Supabase保存→受信箱。Vercel Hobby のcronは1日1回のため、外部の無料cronか手動「受信」ボタンかを決める）②返信・スレッド・添付・既読 ③業務イベント（承認依頼・掲示板・予定）のメール通知
- **切り離し済み**：安全書類は独立ツール `software/安全書類作成ツール` へ移行（#27）
- **検証方法**：nodeはPATH外（`C:\Program Files\nodejs`）。PATHに足して `npx tsc --noEmit` / `npx next build` / `npx eslint`。拡張ブラウザから localhost に届かないため、ライブQAは本番URLで行う

---

## 以下は旧記録（2026-07-08 時点・Codex時代の履歴。パスやコマンドは古い）

## Current Status (old)

- Web app target: `C:\Users\kasae\Documents\Codex\office-workspace`
- Production server verified on `http://127.0.0.1:3001`
- Final build passed with Next.js production build.
- TypeScript check passed.
- Main text mojibake scan passed for `app`, `components`, and `lib`.
- External product names were removed from app UI/code strings in the checked app folders.
- Local demo data storage key is `office-workspace-state-v3` so old broken browser data is not reused.
- 2026-06-20: Past reference HTML was reviewed for schedule, bulletin board, and workflow behavior.
- Schedule now includes group day/week, personal day/week/month/year, department and 10-user paging, search, date navigation, fixed dates, CSV/print, participant and facility selection, conflict warning, visibility, reactions, survey, related files, detail and deletion.
- Bulletin board now includes latest/created/draft lists, category filtering and notifications, publish period, comments/replies, reactions, survey, related files, thread subscriptions, reuse, export, and detail view.
- Workflow now includes latest/sent/inbox/pending/result/draft lists, three-step application wizard, application-specific fields, configurable approval route, confirmation, approval/rejection/return, history, export, and print.
- Supabase schema and DB mappings include the extended schedule, bulletin, and workflow data.
- TypeScript and Next.js production build passed after these changes. Production HTTP returned 200 on port 3001.
- Interaction pass completed: schedule cards now use viewport-safe floating hover previews and lift/tap motion; schedule modes, bulletin lists, and workflow lists use short horizontal entrance transitions; detail screens automatically open as right-side slide drawers; creation and editing screens retain centered pop-up motion; interactive rows animate on entry and hover without moving surrounding layout.
- Reduced-motion browser preferences are respected globally.
- 2026-07-02: 現場リソース管理（Arune相当）を新規ビューとして追加。目的＝重機・機材・車両・人員の現場配置と稼働・点検を自前管理（外部SaaS「現場クラウド Arune」は有料・APIも非公開のため連携せず、同等機能をアプリ内に自作）。
  - 新規ビュー `fieldresources`＝サイドバー「機 現場リソース管理」。4タブ構成：
    1. 配置ボード＝日付選択＋未配置プールと現場カード間で @dnd-kit ドラッグ配置（同日同一リソースは自動的に移動、1リソース＝1配置/日）。現場は既存 `workspaces`（工事スペース）を流用。
    2. リソース台帳＝重機/機材/車両/人員の登録・編集・削除（状態＝稼働可/整備中/故障）。
    3. 稼働予定＝日付ごとの配置一覧・解除。
    4. 点検簿＝リソース別の点検記録（点検日・結果[良/要注意/要修理]・点検者・所見）。
  - データモデル：`FieldResource` / `ResourceAllocation` / `ResourceInspection` を `AppState` に追加。localStorage（キー `office-workspace-state-v3`、seed とマージし後方互換）＋ Supabase 同期（差分upsert/delete）に統合。
  - 編集ファイル：`lib/types.ts`, `lib/store.ts`(seed), `lib/db.ts`(変換/fetchAllState/CRUD/seedIfEmpty), `lib/sync.ts`, `components/Sidebar.tsx`, `app/page.tsx`, `components/views/Placeholder.tsx`。新規：`components/views/FieldResources.tsx`。DB：`schema.sql` に `field_resources` / `resource_allocations` / `resource_inspections` の3テーブル＋RLS＋dev用ポリシーを追記（Supabase利用時のみ実行、ローカル動作には不要）。
  - 検証：`tsc --noEmit` 通過（EXIT 0）、`next build` 成功（EXIT 0）。ブラウザでのクリック実操作は環境制約（localhost QA不可）のため未実施。
  - 未対応・今後の候補：配置の複数現場許可、稼働率グラフ、CSV/印刷出力、点検アラート、位置情報/センサー連携、サイネージ表示。
  - この時点では未コミット（ブランチ `feature/workflow-enhancements-and-search` の作業ツリーに反映）。
- 2026-07-02: 施工体制台帳のExcel出力を「配布正式様式へ差し込み」方式へ刷新。従来のコード再現（簡易レイアウト）を廃し、**配布原本の書式を完全再現**する。
  - 原本 `5_施工体制台帳.xls` を Excel で `.xlsx` 化 → 作成例（社外秘サンプル）を全消去した空欄ひな型を `public/templates/system-ledger-template.xlsx` に配置（罫線・169結合セルを保持）。
  - `lib/safetyDocsExcel.ts`：`downloadSystemLedgerExcel` をテンプレ読込→セル差し込み方式に置換（`fillSystemLedgerSheet` にセル対応表。ズレ調整はここのアドレスのみ）。左＝元請/自社、右＝下請。UI・データモデルは既存のまま（施工体制台帳タブ／編集モーダル／複数作成＝下請追加）。
  - **自社（元請）マスタ**を追加：`PrimeCompanyProfile` を `AppState.primeProfile` に追加（seedは空・実データ非格納）。SafetyDocs の施工体制台帳タブに「自社情報」編集モーダル（全項目テキスト入力）。新規台帳作成時に元請欄へ自動プリフィル。下請は既存「下請業者マスタ」を使い回し。
  - 編集ファイル：`lib/types.ts`, `lib/store.ts`, `lib/safetyDocsExcel.ts`, `components/views/SafetyDocs.tsx`。テンプレ：`public/templates/system-ledger-template.xlsx`（スクラブ済）。
  - 検証：`tsc --noEmit` EXIT 0 / `next build` EXIT 0。出力サンプル（自社×下請の記入例）は目視確認後に削除。
  - 要確認：左（元請）側の一部セル位置（会社名・技術者名まわり）は原本の空欄例から推定。実出力を Excel で見て `fillSystemLedgerSheet` のアドレスを微調整する。
  - 社外秘: テンプレは作成例データをスクラブ済。コミット前に一時ファイル（AI直下のサンプル/位置確認/原本コピー）を削除すること（[[safety-documents-project]] 参照）。未コミット。

- 2026-07-02: 工事日報（工事打合簿）のExcel出力を新設。配布原本 `工事打合簿.xlsx`（自社ロゴ画像入り）を**ZIPとして開きセル値XMLだけ書き換える方式**（`lib/xlsxPatch.ts` の `patchXlsxCells`）で、ロゴ・罫線・結合・体裁を完全再現。exceljs の load→save は画像配置(drawing)を落とすため不採用。`lib/dailyReportExcel.ts`（`buildDailyReportCellMap`＋DL）、`components/views/DailyReport.tsx` 詳細に「⬇ Excel」ボタン追加。テンプレ＝`public/templates/daily-report-template.xlsx`（原本＝ロゴ保持、残存サンプルは実行時にクリア）。`jszip`(^3.10.1) を package.json に明記（既存の transitive を昇格）。検証：`tsc`/`next build` EXIT 0。要確認：一部セル位置（就業時間・使用機械の累計・進捗率の列割当）はサンプル出力で微調整。社外秘: AI直下の一時ファイル（サンプル/原本コピー/ロゴ抽出）はコミット前に整理。未コミット。

## Start Command

Use bundled Node because npm may not be on PATH:

```powershell
cd C:\Users\kasae\Documents\Codex\office-workspace
& "C:\Users\kasae\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\next\dist\bin\next start --hostname 0.0.0.0 --port 3001
```

## Verification Commands

```powershell
& "C:\Users\kasae\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\typescript\bin\tsc --noEmit
& "C:\Users\kasae\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\next\dist\bin\next build
```

## Screenshots

- Login screenshot: `C:\Users\kasae\Documents\Codex\office-workspace\outputs\login-final.png`
- Main-screen DevTools screenshot attempt timed out while receiving the image payload; login screen and HTTP response were verified.

## Notes

- The app is currently a standalone Web app with local persistence and optional Supabase hooks already present.
- Do not reintroduce external service names into visible UI unless explicitly requested.
- Keep the current page-style UI direction and animation style; future work should focus on functionality gaps and browser QA.
- The in-app browser automation runtime failed to start on Windows with an access error during the latest visual QA attempt. Re-run desktop/mobile browser QA when the browser runtime is available.
- Remaining reference-level refinements: dedicated schedule coordination assistant, richer detailed-search filters, bulletin rich-text editing and author edit/delete controls, reusable workflow-form administration, and real authentication/RLS before external operation.

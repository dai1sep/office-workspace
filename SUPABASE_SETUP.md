# Supabase 接続手順

## 1. Supabase プロジェクト作成

1. https://supabase.com にアクセス → **Start your project**
2. GitHub アカウントでサインアップ（無料）
3. **New project** → プロジェクト名・パスワード・リージョン（Tokyo）を入力 → **Create**
4. 作成完了まで約1〜2分待つ

---

## 2. スキーマの適用

1. Supabase ダッシュボード左メニュー → **SQL Editor**
2. `office-workspace/schema.sql` の内容を全コピー
3. SQL Editor に貼り付け → **Run** をクリック
4. 全テーブルが作成されたことを **Table Editor** で確認

---

## 3. API キーの取得

1. ダッシュボード左メニュー → **Settings** → **API**
2. 以下をコピー：
   - **Project URL**（例: `https://abcdefgh.supabase.co`）
   - **anon public** キー（`eyJh...` から始まる長い文字列）

---

## 4. 環境変数の設定

`office-workspace/.env.local` を作成（`.env.local.example` をコピー）:

```
NEXT_PUBLIC_SUPABASE_URL=https://あなたのID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. 動作確認

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
cd C:\Users\kasae\Documents\Codex\office-workspace
npm run dev
```

ブラウザで http://localhost:3000 を開き、ヘッダーに **「Supabase」（緑バッジ）** が表示されれば接続成功。

初回起動時に localStorage のシードデータが自動的に Supabase へ投入されます。

---

## 動作モード

| 状態 | ヘッダーバッジ | 説明 |
|---|---|---|
| `.env.local` なし | グレー「ローカル」 | localStorage のみで動作 |
| 接続中 | オレンジ「接続中…」 | Supabase からデータ取得中 |
| 接続成功 | 緑「Supabase」 | 全操作がリアルタイムで同期 |

---

## データの仕組み

- **書き込み**: 操作するたびに localStorage（即時）＋ Supabase（非同期）に両方保存
- **読み込み**: 起動時に Supabase から全データ取得 → state を上書き
- **オフライン時**: localStorage で動き続け、再接続時に自動同期は不要（次回起動時に最新を取得）

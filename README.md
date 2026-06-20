# office-workspace

社内スケジュール、掲示板、ワークフロー、ToDo、ファイル、設備予約、ナレッジ、ホワイトボードをまとめたWeb業務支援システムです。

## Development

```powershell
npm install
npm run dev
```

ブラウザーで `http://localhost:3000` を開きます。

## Production build

```powershell
npm run build
npm run start
```

## Database

ローカルではブラウザー保存で動作します。複数人でデータ共有する場合は、`.env.local.example` と `SUPABASE_SETUP.md` を参照してデータベースを設定してください。

実際の環境変数、認証情報、ブラウザープロファイルはGit管理対象外です。

# HANDOFF

## Current Status

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

import { NextResponse } from "next/server";
import { serviceClient, verifyRequester, bearerToken } from "@/lib/serverSupabase";

export const runtime = "nodejs";

// メール(SMTP)設定。管理者のみ。パスワードは保存はできるが読み出しては返さない（hasPasswordのみ）。
// 保管は smtp_config（service_roleのみアクセス可の秘匿テーブル）。

// 現在の設定を取得（パスワードは伏せる）。
export async function GET(req: Request) {
  const who = await verifyRequester(bearerToken(req));
  if (!who) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  if (who.role !== "管理者") return NextResponse.json({ error: "管理者のみ設定できます。" }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: "サーバーにサービスキー(SUPABASE_SERVICE_ROLE_KEY)が未設定です。" }, { status: 500 });

  const { data } = await svc.from("smtp_config").select("*").eq("id", "default").maybeSingle();
  return NextResponse.json({
    host: data?.host ?? "",
    port: data?.port ?? 587,
    secure: data?.secure ?? false,
    username: data?.username ?? "",
    from_addr: data?.from_addr ?? "",
    hasPassword: Boolean(data?.password),
  });
}

// 設定を保存（upsert）。パスワードが空なら既存を維持。
export async function POST(req: Request) {
  const who = await verifyRequester(bearerToken(req));
  if (!who) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  if (who.role !== "管理者") return NextResponse.json({ error: "管理者のみ設定できます。" }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: "サーバーにサービスキー(SUPABASE_SERVICE_ROLE_KEY)が未設定です。" }, { status: 500 });

  let body: { host?: string; port?: number | string; secure?: boolean; username?: string; from_addr?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 }); }

  const host = (body.host ?? "").toString().trim();
  const port = Number(body.port ?? 587) || 587;
  const secure = Boolean(body.secure);
  const username = (body.username ?? "").toString().trim();
  const from_addr = (body.from_addr ?? "").toString().trim();
  const password = (body.password ?? "").toString();

  // パスワード空欄なら既存を維持
  const row: Record<string, unknown> = { id: "default", host, port, secure, username, from_addr, updated_at: new Date().toISOString() };
  if (password) row.password = password;

  const { error } = await svc.from("smtp_config").upsert(row);
  if (error) return NextResponse.json({ error: "保存に失敗しました: " + error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

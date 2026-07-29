// サーバー(API Route)専用。service_role キーで RLS を迂回してDBを読み書きする。
// このモジュールはクライアントに読み込ませない（"use client" を付けない・UIから import しない）。
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// service_role クライアント（RLS迂回）。未設定なら null。
export function serviceClient(): SupabaseClient | null {
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Bearerトークンを検証し、対応する社員のメール・ロールを返す。無効なら null。
export async function verifyRequester(token: string): Promise<{ email: string; role: string } | null> {
  if (!token || !url || !anon) return null;
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await anonClient.auth.getUser(token);
  const email = data?.user?.email;
  if (error || !email) return null;

  let role = "一般ユーザー";
  const svc = serviceClient();
  if (svc) {
    const { data: rows } = await svc.from("users").select("email,role");
    const u = (rows ?? []).find((r) => ((r.email as string) ?? "").toLowerCase() === email.toLowerCase());
    if (u?.role) role = u.role as string;
  }
  return { email, role };
}

// リクエストの Authorization ヘッダからトークンを取り出す。
export function bearerToken(req: Request): string {
  return (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

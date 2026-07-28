import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// nodemailer は Node ランタイムが必要（Edge不可）
export const runtime = "nodejs";

// アプリ→御社SMTP でメールを実送信する。ログイン済み(Supabase Auth)ユーザーのみ許可。
// SMTP認証情報はサーバー側の環境変数のみで扱い、ブラウザには一切出さない。
export async function POST(req: Request) {
  // ── 認証：Supabaseのアクセストークンを検証（乗っ取り防止） ──
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!token || !supaUrl || !supaKey) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const supa = createClient(supaUrl, supaKey);
  const { data: userData, error: userErr } = await supa.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "認証に失敗しました。再ログインしてください。" }, { status: 401 });
  }

  // ── SMTP設定（サーバー環境変数） ──
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = (process.env.SMTP_SECURE ?? "").toLowerCase() === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass) {
    return NextResponse.json(
      { error: "サーバーにSMTP設定がありません。Vercelの環境変数 SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM を設定してください。" },
      { status: 500 },
    );
  }

  // ── 入力 ──
  let payload: { to?: string; cc?: string; subject?: string; body?: string; text?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }
  const to = (payload.to ?? "").trim();
  const cc = (payload.cc ?? "").trim() || undefined;
  const subject = (payload.subject ?? "").trim();
  const text = (payload.body ?? payload.text ?? "").toString();
  if (!to || !subject) {
    return NextResponse.json({ error: "宛先と件名は必須です。" }, { status: 400 });
  }

  // ── 送信 ──
  try {
    const transport = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    const info = await transport.sendMail({ from, to, cc, subject, text });
    return NextResponse.json({ ok: true, messageId: info.messageId, from });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "送信に失敗しました: " + message }, { status: 502 });
  }
}

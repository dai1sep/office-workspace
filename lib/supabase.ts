import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

// 環境変数が不正（URL形式でない・キー欄と取り違え等）でもビルド/実行が落ちないよう、
// 検証に失敗したら null を返し、アプリは localStorage で動作し続ける。
function makeClient(): SupabaseClient | null {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("must be http(s)");
    }
    return createClient(url, key);
  } catch (error) {
    console.error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL が不正です。ローカルモードで起動します。値が https://xxxx.supabase.co 形式か、URL欄とキー欄を取り違えていないか確認してください。",
      error,
    );
    return null;
  }
}

export const supabase: SupabaseClient | null = makeClient();

export const isSupabaseReady = (): boolean => supabase !== null;

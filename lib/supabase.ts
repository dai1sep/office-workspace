import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 環境変数未設定時は null。アプリは localStorage で動作し続ける。
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const isSupabaseReady = (): boolean => supabase !== null;

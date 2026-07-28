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

// ログイン中ユーザーのアクセストークン（サーバーAPI呼び出しのBearer認証用）。未ログイン/ローカル時は null。
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// 管理者が従業員のログインアカウントを作成する。
// セッションを保持しない一時クライアントで signUp するため、操作中の管理者のログインは維持される。
// ※ Supabaseの Auth 設定で「Confirm email」を OFF にしておくと、作成後すぐログインできる。
export async function createLoginAccount(email: string, password: string): Promise<{ error: string | null }> {
  if (!url || !key) return { error: "Supabaseが設定されていません（ローカルモード）" };
  try {
    const tmp = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "ow-admin-signup-tmp" },
    });
    const { error } = await tmp.auth.signUp({ email: email.trim(), password });
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

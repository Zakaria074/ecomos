import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SHARED_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function saveSetting(key: string, value: any) {
  await supabase.from("user_settings").upsert(
    { user_id: SHARED_USER_ID, key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
}

export async function loadSetting(key: string) {
  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", SHARED_USER_ID)
    .eq("key", key)
    .single();
  return data?.value ?? null;
}
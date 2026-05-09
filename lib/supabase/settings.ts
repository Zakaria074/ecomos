import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function saveSetting(key: string, value: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_settings").upsert(
    { user_id: user.id, key, value, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
}

export async function loadSetting(key: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", key)
    .single();
  return data?.value ?? null;
}
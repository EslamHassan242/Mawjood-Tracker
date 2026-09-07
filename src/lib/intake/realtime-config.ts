export function publicRealtimeConfig(environment: Record<string, string | undefined>) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
    // Never accidentally return a service-role/secret key from this public endpoint.
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
      if (payload.role !== "anon") return null;
    }
    return { url, key };
  } catch { return null; }
}

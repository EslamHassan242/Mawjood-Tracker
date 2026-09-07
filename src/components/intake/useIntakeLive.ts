"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
function realtimeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}

export async function intakeRequest<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...(body === undefined ? {} : {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }) });
  } catch { throw new Error("تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مجددًا."); }
  let data;
  try { data = await response.json(); } catch { throw new Error("تعذر قراءة البيانات. يرجى المحاولة مجددًا."); }
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الإجراء.");
  return data as T;
}

export function useIntakeLive<T>(url: string, operational = false) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    let disposed = false;
    let running = false;
    let dirty = false;
    const load = async () => {
      // Coalesce events while fetching; always fetch again if a commit occurred in flight.
      dirty = true;
      if (running) return;
      running = true;
      while (dirty && !disposed) {
        dirty = false;
        try {
          const result = await intakeRequest<T>(url);
          if (!disposed) { setData(result); setError(""); }
        } catch (err) {
          if (!disposed) { setData(null); setError((err as Error).message); }
        }
      }
      running = false;
    };
    refreshRef.current = load;
    const supabase = realtimeClient();
    const channel = supabase?.channel(`intake-${crypto.randomUUID()}`);
    channel?.on("postgres_changes", { event: "UPDATE", schema: "public", table: "IntakeRevision", filter: "id=eq.routes" }, () => { void load(); });
    if (operational) channel?.on("postgres_changes", { event: "UPDATE", schema: "public", table: "IntakeRevision", filter: "id=eq.orders" }, () => { void load(); });
    channel?.subscribe(status => {
      if (disposed) return;
      setConnected(status === "SUBSCRIBED");
      // Reconcile after every subscription/reconnection; missed events do not matter.
      if (status === "SUBSCRIBED") void load();
    });
    const resume = () => { if (document.visibilityState === "visible") void load(); };
    const offline = () => setConnected(false);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    void load();
    return () => {
      disposed = true;
      if (channel) void supabase?.removeChannel(channel);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
    };
  }, [url, operational]);
  return { data, error, connected, refresh };
}

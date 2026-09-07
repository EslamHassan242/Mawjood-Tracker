"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
let clientRequest: Promise<SupabaseClient> | undefined;
async function realtimeClient() {
  if (client) return client;
  clientRequest ??= intakeRequest<{ url: string; key: string }>("/api/intake/public/realtime").then(({ url, key }) => {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }).catch(error => { clientRequest = undefined; throw error; });
  return clientRequest;
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
  const [liveError, setLiveError] = useState("");
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
    let supabase: SupabaseClient | undefined;
    let channel: ReturnType<SupabaseClient["channel"]> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;
    const retry = () => {
      if (disposed || retryTimer) return;
      // Connection retries only; business state is never polled.
      retryTimer = setTimeout(() => { retryTimer = undefined; void connect(); }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    };
    const connect = async () => {
      try {
        if (channel && supabase) {
          const old = channel; channel = undefined;
          await supabase.removeChannel(old);
        }
        supabase = await realtimeClient();
        if (disposed) return;
        const subscription = supabase.channel(`intake-${crypto.randomUUID()}`);
        channel = subscription;
        subscription.on("postgres_changes", { event: "UPDATE", schema: "public", table: "IntakeRevision" }, payload => {
          if (payload.new.id === "routes" || (operational && payload.new.id === "orders")) void load();
        }).subscribe(status => {
          if (disposed || channel !== subscription) return;
          setConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            retryDelay = 1000; setLiveError("");
            if (retryTimer) { clearTimeout(retryTimer); retryTimer = undefined; }
            void load();
          } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
            setLiveError("انقطع التحديث المباشر. جارٍ إعادة الاتصال…"); retry();
          }
        });
      } catch (err) {
        if (!disposed) { setConnected(false); setLiveError((err as Error).message); retry(); }
      }
    };
    void connect();
    const resume = () => { if (document.visibilityState === "visible") void load(); };
    const offline = () => setConnected(false);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    void load();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase?.removeChannel(channel);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
    };
  }, [url, operational]);
  return { data, error: error || liveError, connected, refresh };
}

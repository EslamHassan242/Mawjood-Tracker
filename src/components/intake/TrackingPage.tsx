"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { trackingInput } from "@/lib/intake/validation";
import { trackingLabel, customerStatusLabels, type TrackingView } from "@/lib/intake/types";
import { fieldClass, IntakeShell, Notice } from "./IntakeShell";
import { useIntakeLive } from "./useIntakeLive";

function TrackingResult({ reference }: { reference: string }) {
  const { data, error, connected } = useIntakeLive<TrackingView>(`/api/intake/public/tracking/${reference}`, true);
  return <IntakeShell title="حالة طلبك" connected={connected}>
    <Notice error message={error} />
    {!data && !error && <p role="status" className="text-sm text-gray-500 dark:text-gray-400">جارٍ البحث عن الطلب…</p>}
    {data && <article className="space-y-4 rounded-2xl border border-light-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
      <p className="break-all text-sm font-semibold text-light-text-muted dark:text-dark-text-muted">رقم المتابعة: <bdi dir="ltr" className="font-mono text-base text-emerald-700 dark:text-emerald-400">{trackingLabel(data.trackingNumber)}</bdi></p>
      <h2 className="text-2xl font-black text-brand-green-500 dark:text-brand-green-100" aria-live="polite">{customerStatusLabels[data.status]}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">وقت الاستقبال: {new Date(data.createdAt).toLocaleString("ar-EG")}</p>
      {data.status === "ACTIVE" && <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">طلبك مسجل وسيقوم الكابتن بالتواصل معك عند الحاجة.</p>}
      {data.completedAt && <p className="text-xs text-gray-500 dark:text-gray-400">وقت التوصيل: {new Date(data.completedAt).toLocaleString("ar-EG")}</p>}
      {data.cancelledAt && <p className="text-xs text-gray-500 dark:text-gray-400">وقت الإلغاء: {new Date(data.cancelledAt).toLocaleString("ar-EG")}</p>}
      {data.status === "CANCELLED" && <p className="whitespace-pre-wrap break-words rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">سبب الإلغاء: {data.cancellationNote || "يرجى التواصل مع الإدارة لمعرفة التفاصيل."}</p>}
    </article>}
  </IntakeShell>;
}

export default function TrackingPage() {
  const [reference, setReference] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const readHash = () => {
      const code = new URLSearchParams(window.location.hash.slice(1)).get("ref");
      if (code) {
        try { const normalized = trackingInput(code); setReference(normalized); setInput(trackingLabel(normalized)); }
        catch { setError("رابط المتابعة غير صحيح. أدخل الرقم يدويًا."); }
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);
  return <main dir="rtl" lang="ar" className="min-h-screen bg-light-bg px-4 py-8 text-light-text-main transition-colors dark:bg-dark-bg dark:text-dark-text-main">
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/order" className="inline-flex items-center gap-3">
        <Image src="/logo.png" alt="موجود للتوصيل" width={64} height={64} priority className="rounded-2xl shadow-sm" />
        <span className="text-xl font-extrabold text-brand-green-500 dark:text-brand-green-100">موجود للتوصيل</span>
      </Link>
      <h1 className="text-2xl font-extrabold text-light-text-main dark:text-dark-text-main">متابعة طلبك</h1>
      <form noValidate className="space-y-4 rounded-2xl border border-light-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-card" onSubmit={event => {
        event.preventDefault(); setError("");
        try {
          const code = trackingInput(input); setReference(code);
          window.history.replaceState(null, "", `#ref=${code}`);
        } catch (err) { setError((err as Error).message); }
      }}>
        <label className="block space-y-2">
          <span className="font-semibold text-light-text-main dark:text-dark-text-main">رقم متابعة الطلب</span>
          <input dir="ltr" autoComplete="off" placeholder="XXXX-XXXX-XXXX-XXXX" className={fieldClass} value={input} onChange={e => setInput(e.target.value)} maxLength={50} />
        </label>
        <Button type="submit">عرض حالة الطلب</Button>
      </form>
      <Notice error message={error} />
      {reference && <TrackingResult key={reference} reference={reference} />}
      <Link className="inline-block font-bold text-emerald-700 underline dark:text-emerald-400" href="/order">تسجيل طلب جديد</Link>
    </div>
  </main>;
}

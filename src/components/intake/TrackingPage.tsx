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
    {!data && !error && <p role="status">جارٍ البحث عن الطلب…</p>}
    {data && <article className="space-y-4 rounded-2xl border bg-white p-5 dark:bg-dark-card">
      <p className="break-all text-sm">رقم المتابعة: <bdi>{trackingLabel(data.trackingNumber)}</bdi></p>
      <h2 className="text-xl font-bold" aria-live="polite">{customerStatusLabels[data.status]}</h2>
      <p className="text-sm">وقت الاستقبال: {new Date(data.createdAt).toLocaleString("ar-EG")}</p>
      {data.status === "ACTIVE" && <p>طلبك مسجل وسيقوم الكابتن بالتواصل معك عند الحاجة.</p>}
      {data.completedAt && <p>وقت التوصيل: {new Date(data.completedAt).toLocaleString("ar-EG")}</p>}
      {data.cancelledAt && <p>وقت الإلغاء: {new Date(data.cancelledAt).toLocaleString("ar-EG")}</p>}
      {data.status === "CANCELLED" && <p className="whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-3 text-amber-900">سبب الإلغاء: {data.cancellationNote || "يرجى التواصل مع الإدارة لمعرفة التفاصيل."}</p>}
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
  return <main dir="rtl" lang="ar" className="mx-auto min-h-screen w-full max-w-2xl space-y-6 px-4 py-8">
    <Link href="/order" className="flex items-center gap-3"><Image src="/logo.png" alt="موجود للتوصيل" width={64} height={64} className="rounded-2xl" /><span className="font-bold">موجود للتوصيل</span></Link>
    <h1 className="text-2xl font-extrabold">متابعة طلبك</h1>
    <form noValidate className="space-y-3" onSubmit={event => {
      event.preventDefault(); setError("");
      try {
        const code = trackingInput(input); setReference(code);
        window.history.replaceState(null, "", `#ref=${code}`);
      } catch (err) { setError((err as Error).message); }
    }}><label className="block space-y-2"><span>رقم متابعة الطلب</span><input dir="ltr" autoComplete="off" className={fieldClass} value={input} onChange={e => setInput(e.target.value)} maxLength={50} /></label>
      <Button type="submit">عرض حالة الطلب</Button>
    </form>
    <Notice error message={error} />
    {reference && <TrackingResult key={reference} reference={reference} />}
    <Link className="block underline" href="/order">تسجيل طلب جديد</Link>
  </main>;
}

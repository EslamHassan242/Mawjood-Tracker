"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { trackingLabel, type IntakeRoute, type OrderReceipt } from "@/lib/intake/types";
import { IntakeShell, Notice } from "./IntakeShell";
import { OrderForm } from "./OrderForm";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";

export default function PublicOrderPage() {
  const { data, error, connected, refresh } = useIntakeLive<{ routes: IntakeRoute[] }>("/api/intake/public/routes");
  const [success, setSuccess] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  return <main className="min-h-screen bg-light-bg px-4 py-8 text-light-text-main transition-colors dark:bg-dark-bg dark:text-dark-text-main">
    <div dir="rtl" className="mx-auto mb-6 flex max-w-4xl items-center justify-between gap-4 border-b border-light-border pb-4 dark:border-dark-border">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="موجود للتوصيل" width={72} height={72} priority className="rounded-2xl shadow-sm" />
        <span className="text-xl font-black text-brand-green-500 dark:text-brand-green-100">موجود للتوصيل</span>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/order/track" className="rounded-xl border border-emerald-300 bg-emerald-50/50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60">متابعة طلب سابق</Link>
      </div>
    </div>
    <IntakeShell title="اطلب توصيلك مع موجود" connected={connected}>
      <p className="text-sm leading-7 text-light-text-muted dark:text-dark-text-muted">إختر الرحله المناسبة</p>
      <Notice error message={error} />
      <Notice message={success} />
      {receipt && <section className="space-y-4 rounded-2xl border border-emerald-300 bg-white p-6 shadow-sm dark:border-emerald-800/60 dark:bg-dark-card">
        <h2 className="text-xl font-extrabold text-emerald-800 dark:text-emerald-400">تم استقبال طلبك بنجاح</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">احتفظ برقم المتابعة للاستعلام عن حالة طلبك في أي وقت:</p>
        <p className="select-all break-all rounded-xl bg-gray-100 p-4 text-center font-mono text-xl font-bold tracking-wider text-emerald-800 dark:bg-gray-900 dark:text-emerald-400" dir="ltr">{trackingLabel(receipt.trackingNumber)}</p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-xl bg-emerald-700 px-5 py-2.5 font-bold text-white shadow-sm transition-opacity hover:opacity-90 dark:bg-emerald-600" href={`/order/track#ref=${receipt.trackingNumber}`}>متابعة حالة الطلب</Link>
          <Button variant="outline" onClick={async () => {
            try { await navigator.clipboard.writeText(trackingLabel(receipt.trackingNumber)); setSuccess("تم نسخ رقم المتابعة."); }
            catch { setSuccess("يمكنك تحديد رقم المتابعة ونسخه يدويًا."); }
          }}>نسخ رقم المتابعة</Button>
        </div>
      </section>}
      {!data && !error && <p role="status" className="text-sm text-gray-500 dark:text-gray-400">جارٍ تحميل الرحلات المتاحة…</p>}
      {data && (data.routes.length ? <>
        <h2 className="text-lg font-bold text-light-text-main dark:text-dark-text-main">الرحلات المتاحة حاليًا</h2>
        <OrderForm key={formKey} routes={data.routes} publicOnly onSave={async input => {
          const result = await intakeRequest<OrderReceipt>("/api/intake/public/orders", input);
          setReceipt(result);
          setSuccess("تم تسجيل طلبك بنجاح. سيقوم الكابتن بالتواصل معك عند الحاجة.");
          setFormKey(key => key + 1);
          await refresh();
        }} />
      </> : <Notice message="لا يتم استقبال طلبات جديدة حاليًا. سيتم فتح التسجيل عند توفر رحله مناسبة للتوصيل." />)}
    </IntakeShell>
  </main>;
}

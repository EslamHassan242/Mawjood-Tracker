"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { trackingLabel, type IntakeRoute, type OrderReceipt } from "@/lib/intake/types";
import { IntakeShell, Notice } from "./IntakeShell";
import { OrderForm } from "./OrderForm";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";

export default function PublicOrderPage() {
  const { data, error, connected, refresh } = useIntakeLive<{ routes: IntakeRoute[] }>("/api/intake/public/routes");
  const [success, setSuccess] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  return <main className="min-h-screen px-4 py-8"><div dir="rtl" className="mx-auto mb-6 flex max-w-4xl items-center justify-between gap-4">
    <Image src="/logo.png" alt="موجود للتوصيل" width={88} height={88} priority className="rounded-2xl" />
    <Link href="/order/track" className="font-bold text-emerald-700 underline dark:text-emerald-400">متابعة طلب سابق</Link>
  </div><IntakeShell title="اطلب توصيلك مع موجود" connected={connected}>
    <p className="text-sm leading-7">اختر أحد المسارات المتاحة وأدخل بيانات الاستلام والتسليم.</p>
    <Notice error message={error} />
    <Notice message={success} />
    {receipt && <section className="space-y-3 rounded-2xl border border-emerald-300 bg-white p-5 dark:bg-dark-card">
      <h2 className="text-lg font-bold">تم استقبال طلبك</h2>
      <p>احتفظ برقم المتابعة للاستعلام عن حالة طلبك.</p>
      <p className="select-all break-all rounded-xl bg-gray-100 p-3 text-center font-mono dark:bg-gray-900" dir="ltr">{trackingLabel(receipt.trackingNumber)}</p>
      <div className="flex flex-wrap gap-3"><Link className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white" href={`/order/track#ref=${receipt.trackingNumber}`}>متابعة حالة الطلب</Link>
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(trackingLabel(receipt.trackingNumber)); setSuccess("تم نسخ رقم المتابعة."); }
          catch { setSuccess("يمكنك تحديد رقم المتابعة ونسخه يدويًا."); }
        }}>نسخ رقم المتابعة</Button>
      </div>
    </section>}
    {!data && !error && <p role="status">جارٍ تحميل المسارات المتاحة…</p>}
    {data && (data.routes.length ? <>
      <h2 className="text-lg font-bold">الطلبات المتاحة حاليًا</h2>
      <OrderForm key={formKey} routes={data.routes} publicOnly onSave={async input => {
        const result = await intakeRequest<OrderReceipt>("/api/intake/public/orders", input);
        setReceipt(result);
        setSuccess("تم تسجيل طلبك بنجاح. سيقوم الكابتن بالتواصل معك عند الحاجة.");
        setFormKey(key => key + 1);
        await refresh();
      }} />
    </> : <Notice message="لا يتم استقبال طلبات جديدة حاليًا. سيتم فتح التسجيل عند توفر مسار مناسب للتوصيل." />)}
  </IntakeShell></main>;
}

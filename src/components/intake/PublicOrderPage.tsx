"use client";
import { useState } from "react";
import type { IntakeRoute } from "@/lib/intake/types";
import { IntakeShell, Notice } from "./IntakeShell";
import { OrderForm } from "./OrderForm";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";

export default function PublicOrderPage() {
  const { data, error, connected, refresh } = useIntakeLive<{ routes: IntakeRoute[] }>("/api/intake/public/routes");
  const [success, setSuccess] = useState("");
  const [formKey, setFormKey] = useState(0);
  return <main className="min-h-screen px-4 py-8"><IntakeShell title="اطلب توصيلك مع موجود" connected={connected}>
    <p className="text-sm leading-7">اختر أحد المسارات المتاحة وأدخل بيانات الاستلام والتسليم.</p>
    <Notice error message={error} />
    <Notice message={success} />
    {!data && !error && <p role="status">جارٍ تحميل المسارات المتاحة…</p>}
    {data && (data.routes.length ? <>
      <h2 className="text-lg font-bold">الطلبات المتاحة حاليًا</h2>
      <OrderForm key={formKey} routes={data.routes} publicOnly onSave={async input => {
        await intakeRequest("/api/intake/public/orders", input);
        setSuccess("تم تسجيل طلبك بنجاح. سيقوم الكابتن بالتواصل معك عند الحاجة.");
        setFormKey(key => key + 1);
        await refresh();
      }} />
    </> : <Notice message="لا يتم استقبال طلبات جديدة حاليًا. سيتم فتح التسجيل عند توفر مسار مناسب للتوصيل." />)}
  </IntakeShell></main>;
}

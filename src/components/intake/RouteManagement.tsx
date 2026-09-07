"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { areaLabel, routeLabel, type IntakeArea, type IntakeRoute } from "@/lib/intake/types";
import { fieldClass, Notice } from "./IntakeShell";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";

export function RouteManagement() {
  const { data, error, refresh } = useIntakeLive<{ areas: IntakeArea[]; routes: IntakeRoute[] }>("/api/intake/manage");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  async function save(body: unknown, method = "POST") {
    setBusy(true); setActionError(""); setMessage("");
    try { await intakeRequest("/api/intake/manage", body, method); setMessage("تم حفظ التغييرات."); }
    catch (err) { setActionError((err as Error).message); }
    finally { setBusy(false); await refresh(); }
  }
  return <div className="mt-5 space-y-6">
    <Notice error message={error || actionError} /><Notice message={message} />
    <h2 className="text-lg font-bold">المناطق</h2>
    <form noValidate className="flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      void save({ kind: "area", nameAr: form.get("nameAr") });
    }}><label className="grow space-y-2"><span>اسم المنطقة الجديدة بالعربية</span><input className={fieldClass} name="nameAr" maxLength={80} required disabled={busy} /></label><Button disabled={busy}>إضافة منطقة</Button></form>
    {data?.areas.map(area => <form noValidate key={`${area.id}-${area.nameAr}-${area.isActive}`} className="space-y-3 rounded-xl border p-3" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      void save({ kind: "area", id: area.id, nameAr: form.get("nameAr"), isActive: form.has("isActive") }, "PATCH");
    }}>
      <label className="block space-y-2"><span>الاسم العربي للمنطقة{!area.nameAr ? ` (${area.name})` : ""}</span><input className={fieldClass} name="nameAr" defaultValue={area.nameAr || ""} maxLength={80} disabled={busy} /></label>
      <label className="flex gap-2"><input type="checkbox" name="isActive" defaultChecked={area.isActive} disabled={busy} />منطقة مفعلة لاستقبال الطلبات</label>
      <Button disabled={busy} variant="outline">حفظ المنطقة</Button>
    </form>)}
    <h2 className="text-lg font-bold">إضافة مسار</h2>
    <p className="text-sm leading-7">المسارات الجديدة تكون مغلقة للاستقبال حتى يتم فتحها يدويًا. السعر خاص بتسجيل المشاوير الحالي.</p>
    <form noValidate className="space-y-3" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const price = form.get("price");
      void save({ kind: "route", fromAreaId: form.get("fromAreaId"), toAreaId: form.get("toAreaId"), price: price === "" ? null : Number(price) });
    }}>
      <div className="grid gap-3 sm:grid-cols-2">{([ ["fromAreaId", "منطقة الاستلام"], ["toAreaId", "منطقة التسليم"] ] as const).map(([name, label]) => <label key={name} className="space-y-2"><span>{label}</span><select name={name} className={fieldClass} disabled={busy}><option value="">اختر المنطقة</option>{data?.areas.filter(a => a.isActive && a.nameAr).map(area => <option key={area.id} value={area.id}>{areaLabel(area)}</option>)}</select></label>)}</div>
      <label className="block space-y-2"><span>سعر المشوار (جنيه)</span><input className={fieldClass} type="number" name="price" min="0" step="0.01" disabled={busy} /></label>
      <Button disabled={busy}>إضافة مسار</Button>
    </form>
    <h2 className="text-lg font-bold">تفعيل المسارات</h2>
    <p className="text-sm leading-7">تعطيل المسار يمنع تسجيل مشاوير جديدة عليه، ويغلق استقبال الطلبات. تبقى الطلبات السابقة محفوظة.</p>
    {data?.routes.map(route => <div key={route.id} className="space-y-3 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span>{routeLabel(route)}</span><Button disabled={busy} variant="outline" onClick={() => {
      if (window.confirm(route.isActive ? "هل تريد تعطيل هذا المسار؟" : "هل تريد تفعيل هذا المسار؟")) void save({ kind: "route", id: route.id, isActive: !route.isActive }, "PATCH");
    }}>{route.isActive ? "تعطيل المسار" : "تفعيل المسار"}</Button></div>
      <details><summary className="cursor-pointer text-sm underline">تعديل تعريف المسار وسعره</summary>
        <form noValidate key={`${route.fromAreaId}-${route.toAreaId}-${route.price}`} className="mt-3 space-y-3" onSubmit={event => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          void save({ kind: "route", id: route.id, fromAreaId: form.get("fromAreaId"), toAreaId: form.get("toAreaId"), price: form.get("price") === "" ? null : Number(form.get("price")) }, "PATCH");
        }}>
          <p className="text-sm">حفظ التعديلات يغلق الاستقبال. يمكن تغيير المناطق فقط إذا لم توجد طلبات أو مشاوير مرتبطة بالمسار.</p>
          {([ ["fromAreaId", "منطقة الاستلام"], ["toAreaId", "منطقة التسليم"] ] as const).map(([name, label]) => <label key={name} className="block space-y-2"><span>{label}</span><select name={name} defaultValue={route[name]} className={fieldClass} disabled={busy}>{data.areas.map(area => <option key={area.id} value={area.id}>{areaLabel(area)}</option>)}</select></label>)}
          <label className="block space-y-2"><span>سعر المشوار (جنيه)</span><input className={fieldClass} name="price" type="number" min="0" step="0.01" defaultValue={route.price} disabled={busy} /></label>
          <Button disabled={busy}>حفظ المسار</Button>
        </form>
      </details>
    </div>)}
  </div>;
}

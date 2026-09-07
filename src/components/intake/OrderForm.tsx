"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { IntakeRoute, OrderInput, OrderView } from "@/lib/intake/types";
import { routeLabel } from "@/lib/intake/types";
import { orderInput } from "@/lib/intake/validation";
import { fieldClass, Notice } from "./IntakeShell";

export function OrderForm({ routes, initial, publicOnly = false, onSave, onCancel }: {
  routes: IntakeRoute[]; initial?: OrderView; publicOnly?: boolean;
  onSave: (input: OrderInput & { requestKey: string }) => Promise<void>; onCancel?: () => void;
}) {
  const [routeId, setRouteId] = useState(initial?.routeId || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const selected = routes.find(r => r.id === routeId);
  const closed = publicOnly && routeId !== "" && !selected;
  const requireSender = selected ? selected.requireSenderPhone !== false : true;
  const requireReceiver = selected ? selected.requireReceiverPhone !== false : true;

  return <form noValidate className="space-y-4 rounded-2xl border border-light-border bg-white p-5 text-light-text-main shadow-sm dark:border-dark-border dark:bg-dark-card dark:text-dark-text-main" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const input = orderInput({ routeId, ...Object.fromEntries(form.entries()) }, selected || undefined);
      if (closed) throw new Error("تم إغلاق هذه الرحلة. اختر رحلة متاحة.");
      setBusy(true);  
      await onSave({ ...input, requestKey });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }}>
    {initial ? <p className="font-bold text-lg">من {initial.fromAreaName} إلى {initial.toAreaName}</p> :
      <label className="block space-y-2"><span className="font-semibold text-light-text-main dark:text-dark-text-main">مسار التوصيل</span>
        <select className={fieldClass} value={routeId} onChange={e => setRouteId(e.target.value)} disabled={busy}>
          <option value="" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">اختر رحلة</option>
          {closed && <option value={routeId} className="bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200">المسار المحدد مغلق حاليًا</option>}
          {routes.map(route => <option key={route.id} value={route.id} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">{routeLabel(route)}{!publicOnly && !route.isOpen ? " (مغلق للطلبات العامة)" : ""}</option>)}
        </select>
      </label>}
    {closed && <Notice error message="تم إغلاق استقبال الطلبات لهذة الرحلة. يمكنك الاحتفاظ بالبيانات واختيار رحلة آخر متاحة." />}
    {(routeId || initial) && <>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["pickupBuilding", "من ", "text", 80, true],
          ["senderPhone", requireSender ? "رقم هاتف الراسل" : "رقم هاتف الراسل (اختياري)", "tel", 30, requireSender],
          ["deliveryBuilding", "الى", "text", 80, true],
          ["receiverPhone", requireReceiver ? "رقم هاتف المستلم" : "رقم هاتف المستلم (اختياري)", "tel", 30, requireReceiver],
        ] as const).map(([name, label, type, maxLength, required]) => <label key={name} className="block space-y-2">
          <span className="font-semibold text-light-text-main dark:text-dark-text-main">{label}</span>
          <input name={name} type={type} dir={type === "tel" ? "ltr" : undefined} required={required} maxLength={maxLength}
            defaultValue={initial?.[name as keyof OrderView] as string || ""} disabled={busy} className={fieldClass}
            placeholder={type === "tel" ? "01012345678" : undefined} />
        </label>)}
      </div>
      <label className="block space-y-2"><span className="font-semibold text-light-text-main dark:text-dark-text-main">ملاحظات </span>
        <textarea name="notes" rows={3} maxLength={1000} defaultValue={initial?.notes || ""} disabled={busy} className={fieldClass} />
      </label>
    </>}
    <Notice error message={error} />
    <div className="flex flex-wrap gap-3">
      <Button type="submit" isLoading={busy} disabled={!routeId || closed}>{initial ? "حفظ التعديلات" : "إرسال الطلب"}</Button>
      {onCancel && <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>إلغاء</Button>}
    </div>
  </form>;
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { hasPermission } from "@/lib/permissions";
import { statusLabels, trackingLabel, type IntakeRoute, type OrderView } from "@/lib/intake/types";
import { IntakeShell, Notice } from "./IntakeShell";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";
import { OrderForm } from "./OrderForm";

export default function OrdersPage({ captain = false }: { captain?: boolean }) {
  const [history, setHistory] = useState(false);
  const [cursor, setCursor] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "custom_day" | "range">("all");
  const [customDate, setCustomDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  let dateParams = "";
  if (history) {
    if (dateFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      dateParams = `&startDate=${today}&endDate=${today}`;
    } else if (dateFilter === "custom_day" && customDate) {
      dateParams = `&startDate=${customDate}&endDate=${customDate}`;
    } else if (dateFilter === "range") {
      if (startDate) dateParams += `&startDate=${startDate}`;
      if (endDate) dateParams += `&endDate=${endDate}`;
    }
  }

  const { data, error, connected, refresh } = useIntakeLive<{ orders: OrderView[]; role: string; nextCursor: string | null }>(
    `/api/intake/orders?history=${history}&cursor=${encodeURIComponent(cursor)}${dateParams}`, true);
  const routeState = useIntakeLive<{ routes: IntakeRoute[] }>("/api/intake/routes");
  const [editing, setEditing] = useState<OrderView | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const role = data?.role || "";
  const prefix = captain ? "/captain" : "/admin";
  async function change(order: OrderView, action: "complete" | "cancel") {
    if (!window.confirm(action === "complete" ? "هل تم توصيل هذا الطلب؟" : "هل تريد إلغاء هذا الطلب؟")) return;
    const cancellationNote = action === "cancel" ? window.prompt("سبب الإلغاء (سيظهر للعميل — لا تكتب بيانات شخصية):") : undefined;
    if (action === "cancel" && cancellationNote === null) return;
    if (action === "cancel" && !cancellationNote?.trim()) { setActionError("يرجى كتابة سبب الإلغاء الذي سيظهر للعميل."); return; }
    setBusy(order.id); setActionError("");
    try {
      await intakeRequest(`/api/intake/orders/${order.id}`, { action, version: order.version, cancellationNote }, "PATCH");
      setMessage(action === "complete" ? "تم إكمال الطلب ونقله إلى السجل." : "تم إلغاء الطلب وحفظه في السجل.");
    } catch (err) { setActionError((err as Error).message); }
    finally { setBusy(""); await refresh(); }
  }
  return <IntakeShell title="طلبات التوصيل" connected={connected}>
    <nav className="flex flex-wrap items-center gap-3">
      <Link className="underline" href={`${prefix}/intake`}>التحكم في استقبال الطلبات</Link>
      <Link className="underline" href="/order" target="_blank">رابط طلبات العملاء</Link>
      <Button variant={history ? "outline" : "primary"} onClick={() => { setHistory(false); setCursor(""); setEditing(null); }}>الطلبات النشطة</Button>
      {hasPermission(role, "Orders.ViewHistory") && <Button variant={history ? "primary" : "outline"} onClick={() => { setHistory(true); setCursor(""); setEditing(null); }}>سجل الطلبات</Button>}
      {hasPermission(role, "Orders.Create") && <Button onClick={() => { setCreating(true); setEditing(null); }}>إضافة طلب يدوي</Button>}
    </nav>

    {history && (
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-light-border bg-white dark:border-dark-border dark:bg-dark-card shadow-xs text-sm">
        <span className="font-bold text-light-text-main dark:text-dark-text-main">تصفية السجل بالتاريخ:</span>
        <select
          className="rounded-xl border border-light-border bg-white px-3 py-1.5 font-semibold text-light-text-main dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value as any);
            setCursor("");
          }}
        >
          <option value="all">جميع التواريخ</option>
          <option value="today">اليوم فقط</option>
          <option value="custom_day">يوم محدد</option>
          <option value="range">فترة محددة (من - إلى)</option>
        </select>

        {dateFilter === "custom_day" && (
          <div className="flex items-center gap-2">
            <label className="font-semibold text-xs text-light-text-muted dark:text-dark-text-muted">اليوم:</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => { setCustomDate(e.target.value); setCursor(""); }}
              className="rounded-xl border border-light-border bg-white px-3 py-1.5 font-semibold text-light-text-main dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-main focus:outline-none"
            />
          </div>
        )}

        {dateFilter === "range" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="font-semibold text-xs text-light-text-muted dark:text-dark-text-muted">من:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCursor(""); }}
              className="rounded-xl border border-light-border bg-white px-3 py-1.5 font-semibold text-light-text-main dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-main focus:outline-none"
            />
            <label className="font-semibold text-xs text-light-text-muted dark:text-dark-text-muted">إلى:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCursor(""); }}
              className="rounded-xl border border-light-border bg-white px-3 py-1.5 font-semibold text-light-text-main dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-main focus:outline-none"
            />
          </div>
        )}
      </div>
    )}
    <Notice error message={error || actionError} /><Notice message={message} />
    {data && (creating || editing) && <div className="space-y-3">
      <h2 className="font-bold">{editing ? "تعديل بيانات الطلب" : "إضافة طلب يدوي"}</h2>
      {!editing && <Notice error message={routeState.error} />}
      {editing && data && !data.orders.some(o => o.id === editing.id && o.version === editing.version) &&
        <Notice error message="تم تغيير هذا الطلب. أغلق نموذج التعديل وافتحه مجددًا للحصول على أحدث البيانات." />}
      <OrderForm key={editing?.id || "new"} initial={editing || undefined}
        routes={(routeState.data?.routes || []).filter(r => r.isActive && r.fromArea.isActive && r.toArea.isActive && r.fromArea.nameAr && r.toArea.nameAr)}
        onCancel={() => { setCreating(false); setEditing(null); }} onSave={async input => {
          try {
            await intakeRequest(editing ? `/api/intake/orders/${editing.id}` : "/api/intake/orders",
              editing ? { ...input, action: "edit", version: editing.version } : input, editing ? "PATCH" : "POST");
            setCreating(false); setEditing(null); setMessage("تم حفظ الطلب بنجاح.");
          } finally { await refresh(); }
        }} />
    </div>}
    {!data && !error && <p role="status">جارٍ تحميل الطلبات…</p>}
    {data?.orders.length === 0 && <Notice message={history ? "لا توجد طلبات في السجل حاليًا." : "لا توجد طلبات نشطة حاليًا. ستظهر الطلبات الجديدة هنا تلقائيًا."} />}
    <div className="grid gap-4 lg:grid-cols-2">
      {data?.orders.map(order => <article key={order.id} className="space-y-4 rounded-2xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-extrabold">من {order.fromAreaName} إلى {order.toAreaName}</h2><span className="rounded-lg bg-emerald-50 px-2 py-1 text-sm text-emerald-900">{statusLabels[order.status]}</span></div>
        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("ar-EG")} · {order.source === "PUBLIC" ? "طلب عميل" : "طلب يدوي"}</p>
        <p className="break-all text-xs">رقم المتابعة: <bdi>{trackingLabel(order.trackingNumber)}</bdi></p>
        <Link className="text-sm underline" target="_blank" href={`/order/track#ref=${order.trackingNumber}`}>رابط متابعة العميل</Link>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><h3 className="font-bold">الاستلام</h3><p className="break-words">عمارة: {order.pickupBuilding}</p><a className="block break-all text-emerald-700 underline dark:text-emerald-400" href={`tel:${order.senderPhone}`}><bdi>{order.senderPhone}</bdi><span className="block text-sm">اتصال بالراسل</span></a></div>
          <div className="space-y-2"><h3 className="font-bold">التسليم</h3><p className="break-words">عمارة: {order.deliveryBuilding}</p><a className="block break-all text-emerald-700 underline dark:text-emerald-400" href={`tel:${order.receiverPhone}`}><bdi>{order.receiverPhone}</bdi><span className="block text-sm">اتصال بالمستلم</span></a></div>
        </div>
        {order.notes && <p className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-sm leading-7 dark:bg-gray-900">ملاحظات: {order.notes}</p>}
        {order.cancellationNote && <p className="whitespace-pre-wrap break-words text-sm">سبب الإلغاء للعميل: {order.cancellationNote}</p>}
        {(order.completedAt || order.cancelledAt) && <p className="text-xs">{order.completedAt ? "وقت الإكمال: " : "وقت الإلغاء: "}{new Date((order.completedAt || order.cancelledAt)!).toLocaleString("ar-EG")}</p>}
        <div className="flex flex-wrap gap-2">
          {order.status === "ACTIVE" && hasPermission(role, "Orders.Complete") && <Button disabled={!!busy} onClick={() => void change(order, "complete")}>تم التوصيل</Button>}
          {hasPermission(role, order.status === "ACTIVE" ? "Orders.Edit" : "Orders.EditArchive") && <Button variant="outline" onClick={() => { setEditing(order); setCreating(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>تعديل</Button>}
          {order.status === "ACTIVE" && hasPermission(role, "Orders.Cancel") && <Button variant="danger" disabled={!!busy} onClick={() => void change(order, "cancel")}>إلغاء الطلب</Button>}
        </div>
      </article>)}
    </div>
    {history && <div className="flex gap-3">{cursor && <Button variant="outline" onClick={() => setCursor("")}>أحدث الطلبات</Button>}{data?.nextCursor && <Button onClick={() => setCursor(data.nextCursor!)}>طلبات أقدم</Button>}</div>}
  </IntakeShell>;
}

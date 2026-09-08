"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { hasPermission } from "@/lib/permissions";
import { routeLabel, areaLabel, type IntakeControls } from "@/lib/intake/types";
import { IntakeShell, Notice } from "./IntakeShell";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";
import { RouteManagement } from "./RouteManagement";

export default function IntakePage({ captain = false }: { captain?: boolean }) {
  const { data, error, connected, refresh } = useIntakeLive<IntakeControls>("/api/intake/routes");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  return <IntakeShell title="التحكم في استقبال الطلبات" connected={connected}>
    <nav className="flex flex-wrap gap-4"><Link className="underline" href={captain ? "/captain/orders" : "/admin/orders"}>طلبات التوصيل</Link><Link className="underline" href="/order" target="_blank">رابط طلبات العملاء</Link></nav>
    <p className="text-sm leading-7">افتح المسارات المناسبة لاستقبال طلبات العملاء. إغلاق المسار لا يؤثر على الطلبات المسجلة.</p>
    <Notice error message={error || actionError} /><Notice message={message} />
    {data && hasPermission(data.role, "Routes.ConfigureCaptain") && <section className="space-y-3 rounded-2xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
      <h2 className="font-bold">صلاحية الكابتن في استقبال الطلبات</h2>
      <p className="text-sm leading-7">عند السماح، يستطيع الكابتن فتح وإغلاق المسارات وتفعيل وتعطيل مناطق التوصيل الموجودة. لا تشمل الصلاحية إضافة المناطق أو حذفها.</p>
      <Button role="switch" aria-checked={data.captainCanChangeAvailability} disabled={!!busy} variant={data.captainCanChangeAvailability ? "outline" : "primary"} onClick={async () => {
        setBusy("settings"); setActionError("");
        try {
          await intakeRequest("/api/intake/settings", { captainCanChangeAvailability: !data.captainCanChangeAvailability, version: data.settingsVersion }, "PATCH");
          setMessage(data.captainCanChangeAvailability ? "تم إيقاف صلاحية الكابتن في تغيير الاستقبال." : "تم السماح للكابتن بالتحكم في الاستقبال.");
        } catch (err) { setActionError((err as Error).message); }
        finally { setBusy(""); await refresh(); }
      }}>{data.captainCanChangeAvailability ? "مسموح للكابتن — إيقاف الصلاحية" : "غير مسموح — السماح للكابتن"}</Button>
    </section>}
    {data && !data.canChangeAvailability && <Notice message="يمكنك مشاهدة حالة الاستقبال. تغيير الحالة يحتاج إلى سماح الإدارة." />}
    {!data && !error && <p role="status">جارٍ تحميل المسارات…</p>}
    {data?.routes.length === 0 && <Notice message="لا توجد مسارات مسجلة. يرجى التواصل مع الإدارة لإضافة المسارات." />}
    <div className="grid gap-3 sm:grid-cols-2">
      {data?.routes.map(route => {
        const available = route.isActive && route.fromArea.isActive && route.toArea.isActive && !!route.fromArea.nameAr && !!route.toArea.nameAr;
        const open = route.isOpen && available;
        return <article key={route.id} className="space-y-3 rounded-2xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
          <h2 className="font-bold">{routeLabel(route)}</h2>
          <p className={`text-sm ${open ? "text-emerald-700 dark:text-emerald-400" : "text-light-text-muted dark:text-dark-text-muted"}`}>{open ? "مفتوح لاستقبال الطلبات" : "مغلق"}</p>
          {!available && <p className="text-sm text-amber-700 dark:text-amber-400">المسار أو إحدى مناطقه غير مفعلة، أو ينقصها الاسم العربي.</p>}
          <Button role="switch" aria-checked={!!open} aria-label={`${open ? "إغلاق" : "فتح"} ${routeLabel(route)}`} variant={open ? "outline" : "primary"}
            disabled={!data.canChangeAvailability || !!busy || (!available && !route.isOpen)} isLoading={busy === route.id} onClick={async () => {
              setBusy(route.id); setActionError(""); setMessage("");
              try {
                await intakeRequest(`/api/intake/routes/${route.id}`, { isOpen: !route.isOpen, version: route.availabilityVersion }, "PATCH");
                setMessage(route.isOpen ? "تم إغلاق استقبال الطلبات للمسار." : "تم فتح المسار لاستقبال الطلبات.");
              } catch (err) { setActionError((err as Error).message); }
              finally { setBusy(""); await refresh(); }
            }}>{route.isOpen ? "إغلاق الاستقبال" : "فتح الاستقبال"}</Button>
        </article>;
      })}
    </div>
    {data && (data.canChangeAreaAvailability || captain) && <section className="space-y-3">
      <h2 className="text-lg font-bold">مناطق التوصيل</h2>
      <p className="text-sm leading-7">تعطيل منطقة يغلق استقبال الطلبات على مساراتها. إعادة تفعيلها لا تفتح المسارات تلقائيًا ولا تغير الطلبات المسجلة.</p>
      {data.areas.map(area => <article key={area.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
        <span>{areaLabel(area)} · {area.isActive ? "مفعلة" : "معطلة"}</span>
        <Button variant="outline" disabled={!!busy || !data.canChangeAreaAvailability} onClick={async () => {
          if (!window.confirm(area.isActive ? "هل تريد تعطيل هذه المنطقة وإغلاق استقبال الطلبات على مساراتها؟" : "هل تريد تفعيل هذه المنطقة؟")) return;
          setBusy(area.id); setActionError("");
          try {
            await intakeRequest(`/api/intake/areas/${area.id}`, { isActive: !area.isActive, version: area.availabilityVersion }, "PATCH");
            setMessage("تم تحديث حالة المنطقة.");
          } catch (err) { setActionError((err as Error).message); }
          finally { setBusy(""); await refresh(); }
        }}>{area.isActive ? "تعطيل المنطقة" : "تفعيل المنطقة"}</Button>
      </article>)}
    </section>}
    {data && hasPermission(data.role, "Routes.Manage") && <details className="rounded-2xl border border-light-border p-4 dark:border-dark-border"><summary className="cursor-pointer font-bold">إدارة المناطق والمسارات</summary><RouteManagement /></details>}
  </IntakeShell>;
}

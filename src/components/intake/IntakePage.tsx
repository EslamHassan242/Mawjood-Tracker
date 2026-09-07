"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { hasPermission } from "@/lib/permissions";
import { routeLabel, type IntakeRoute } from "@/lib/intake/types";
import { IntakeShell, Notice } from "./IntakeShell";
import { intakeRequest, useIntakeLive } from "./useIntakeLive";
import { RouteManagement } from "./RouteManagement";

export default function IntakePage({ captain = false }: { captain?: boolean }) {
  const { data, error, connected, refresh } = useIntakeLive<{ routes: IntakeRoute[]; role: string }>("/api/intake/routes");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  return <IntakeShell title="التحكم في استقبال الطلبات" connected={connected}>
    <nav className="flex flex-wrap gap-4"><Link className="underline" href={captain ? "/captain/orders" : "/admin/orders"}>طلبات التوصيل</Link><Link className="underline" href="/order" target="_blank">رابط طلبات العملاء</Link></nav>
    <p className="text-sm leading-7">افتح المسارات المناسبة لاستقبال طلبات العملاء. إغلاق المسار لا يؤثر على الطلبات المسجلة.</p>
    <Notice error message={error || actionError} /><Notice message={message} />
    {!data && !error && <p role="status">جارٍ تحميل المسارات…</p>}
    {data?.routes.length === 0 && <Notice message="لا توجد مسارات مسجلة. يرجى التواصل مع الإدارة لإضافة المسارات." />}
    <div className="grid gap-3 sm:grid-cols-2">
      {data?.routes.map(route => {
        const available = route.isActive && route.fromArea.isActive && route.toArea.isActive && !!route.fromArea.nameAr && !!route.toArea.nameAr;
        const open = route.isOpen && available;
        return <article key={route.id} className="space-y-3 rounded-2xl border border-light-border bg-white p-4 dark:border-dark-border dark:bg-dark-card">
          <h2 className="font-bold">{routeLabel(route)}</h2>
          <p className={`text-sm ${open ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"}`}>{open ? "مفتوح لاستقبال الطلبات" : "مغلق"}</p>
          {!available && <p className="text-sm text-amber-700 dark:text-amber-400">المسار أو إحدى مناطقه غير مفعلة، أو ينقصها الاسم العربي.</p>}
          <Button role="switch" aria-checked={!!open} aria-label={`${open ? "إغلاق" : "فتح"} ${routeLabel(route)}`} variant={open ? "outline" : "primary"}
            disabled={!!busy || (!available && !route.isOpen)} isLoading={busy === route.id} onClick={async () => {
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
    {data && hasPermission(data.role, "Routes.Manage") && <details className="rounded-2xl border p-4"><summary className="cursor-pointer font-bold">إدارة المناطق والمسارات</summary><RouteManagement /></details>}
  </IntakeShell>;
}

"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { captainAccountInput } from "@/lib/captain-account-input";
import { toast } from "sonner";

interface CaptainProfile { id: string; name: string; email: string; isActive: boolean }
const inputClass = "w-full rounded-xl border border-light-border bg-white p-3 text-light-text-main dark:border-dark-border dark:bg-dark-card dark:text-dark-text-main";

function AccountForm({ captain, reset, onClose, onUpdated }: {
  captain: CaptainProfile; reset: boolean; onClose: () => void; onUpdated: (captain: CaptainProfile) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formId = `captain-account-${captain.id}`;
  return <div dir="rtl" lang="ar"><Modal isOpen onClose={() => { if (!busy) onClose(); }}
    title={reset ? `إعادة تعيين كلمة المرور — ${captain.name}` : "تعديل حساب الكابتن"}
    footer={<><Button variant="outline" disabled={busy} onClick={onClose}>إلغاء</Button><Button type="submit" form={formId} isLoading={busy}>{reset ? "تعيين كلمة المرور" : "حفظ التعديلات"}</Button></>}>
    <form id={formId} noValidate className="space-y-4" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setError("");
      const fields = new FormData(event.currentTarget);
      try {
        if (reset && fields.get("password") !== fields.get("confirmPassword")) throw new Error("كلمتا المرور غير متطابقتين.");
        const input = captainAccountInput(reset ? { password: fields.get("password") } : {
          name: fields.get("name"), email: fields.get("email"), isActive: fields.has("isActive"),
        });
        setBusy(true);
        const response = await fetch(`/api/admin/captains/${captain.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر حفظ التعديلات.");
        onUpdated(data.captain); toast.success(data.message); onClose();
      } catch (err) { setError(err instanceof Error ? err.message : "تعذر الاتصال بالخادم. حاول مجددًا."); }
      finally { setBusy(false); }
    }}>
      {reset ? <>
        <p className="text-sm leading-7">عيّن كلمة مرور جديدة وأبلغ الكابتن بها ليستخدمها عند تسجيل الدخول.</p>
        <label className="block space-y-2"><span>كلمة المرور الجديدة</span><input className={inputClass} name="password" type="password" autoComplete="new-password" dir="ltr" minLength={8} maxLength={72} disabled={busy} required /></label>
        <label className="block space-y-2"><span>تأكيد كلمة المرور</span><input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" maxLength={72} disabled={busy} required /></label>
        <p className="text-sm text-light-text-muted dark:text-dark-text-muted">٨ أحرف على الأقل.</p>
      </> : <>
        <label className="block space-y-2"><span>اسم الكابتن</span><input className={inputClass} name="name" defaultValue={captain.name} maxLength={100} disabled={busy} required /></label>
        <label className="block space-y-2"><span>البريد الإلكتروني</span><input className={inputClass} name="email" type="email" dir="ltr" defaultValue={captain.email} maxLength={254} disabled={busy} required /></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={captain.isActive} disabled={busy} />الحساب مفعل</label>
      </>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    </form>
  </Modal></div>;
}

export function CaptainAccountActions({ captain, onUpdated }: { captain: CaptainProfile; onUpdated: (captain: CaptainProfile) => void }) {
  const [action, setAction] = useState<"edit" | "reset" | null>(null);
  return <>
    <div dir="rtl" className="mt-4 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setAction("edit")}>تعديل الحساب</Button>
      <Button variant="outline" size="sm" onClick={() => setAction("reset")}>إعادة تعيين كلمة المرور</Button>
    </div>
    {action && createPortal(<AccountForm captain={captain} reset={action === "reset"} onClose={() => setAction(null)} onUpdated={onUpdated} />, document.body)}
  </>;
}

import type { ReactNode } from "react";

export function IntakeShell({ title, connected, children }: { title: string; connected: boolean; children: ReactNode }) {
  return <section dir="rtl" lang="ar" className="mx-auto w-full max-w-4xl space-y-5 text-start">
    <header className="space-y-2">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p role="status" className={`text-sm ${connected ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
        {connected ? "متصل · يتم تحديث البيانات تلقائيًا" : "الاتصال المباشر غير متاح حاليًا · جارٍ محاولة الاتصال"}
      </p>
    </header>
    {children}
  </section>;
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return <p role={error ? "alert" : "status"} className={`rounded-xl border p-4 text-sm leading-7 ${error ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>;
}
export const fieldClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white";

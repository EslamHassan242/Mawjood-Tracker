import type { ReactNode } from "react";

export function IntakeShell({ title, connected, children }: { title: string; connected: boolean; children: ReactNode }) {
  return <section dir="rtl" lang="ar" className="mx-auto w-full max-w-4xl space-y-5 text-start">
    <header className="space-y-2">
      <h1 className="text-2xl font-extrabold text-light-text-main dark:text-dark-text-main">{title}</h1>
      <p role="status" className={`text-sm font-medium ${connected ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
        {connected ? "متصل · يتم تحديث البيانات تلقائيًا" : "جاري تحديث البيانات تلقائيًا…"}
      </p>
    </header>
    {children}
  </section>;
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return <p role={error ? "alert" : "status"} className={`rounded-xl border p-4 text-sm leading-7 font-medium ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"}`}>{message}</p>;
}
export const fieldClass = "w-full rounded-xl border border-light-border bg-white px-4 py-3 text-base text-light-text-main transition-colors placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-dark-border dark:bg-dark-card dark:text-dark-text-main dark:placeholder:text-gray-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";


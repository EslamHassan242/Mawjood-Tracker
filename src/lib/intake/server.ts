import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type FeaturePermission } from "@/lib/permissions";
import { IntakeError } from "./validation";

export async function requirePermission(permission: FeaturePermission) {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new IntakeError("يرجى تسجيل الدخول للمتابعة.", 401);
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, isActive: true } });
  if (!user?.isActive || !hasPermission(user.role, permission)) throw new IntakeError("ليس لديك صلاحية لتنفيذ هذا الإجراء.", 403);
  return user;
}

export async function readBody(request: Request) {
  // These endpoints accept small JSON forms only; never trust Content-Length alone.
  if (!request.headers.get("content-type")?.includes("application/json")) throw new IntakeError("صيغة البيانات غير صحيحة.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new IntakeError("بيانات الطلب مطلوبة.");
  const decoder = new TextDecoder();
  let text = "", size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new IntakeError("حجم البيانات أكبر من المسموح.", 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try { return JSON.parse(text) as unknown; } catch { throw new IntakeError("بيانات الطلب غير صحيحة."); }
  } finally { reader.releaseLock(); }
}

export async function apiResult(action: () => Promise<unknown>) {
  try {
    return Response.json(await action(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const conflict = code === "P2002" || code === "P2003" || code === "P2034";
    if (!(error instanceof IntakeError)) console.error("Intake operation failed", error);
    return Response.json({ error: error instanceof IntakeError ? error.message : conflict
      ? "تعارضت البيانات مع تعديل آخر أو سجل موجود. يرجى المحاولة مجددًا."
      : "تعذر تنفيذ الطلب الآن. يرجى المحاولة مجددًا." }, {
      status: error instanceof IntakeError ? error.status : conflict ? 409 : 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}

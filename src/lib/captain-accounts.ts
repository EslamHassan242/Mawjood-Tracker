import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";
import { events } from "@/lib/events";
import { hash } from "bcryptjs";
import { CaptainAccountError, captainAccountInput } from "./captain-account-input";

export async function updateCaptainAccount(id: string, input: unknown) {
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) throw new CaptainAccountError("يرجى تسجيل الدخول.", 401);
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true, isActive: true } });
  if (!actor?.isActive || !canWrite(actor.role)) throw new CaptainAccountError("ليس لديك صلاحية لتعديل حسابات الكباتن.", 403);
  const { password, ...profile } = captainAccountInput(input);
  const data = { ...profile, ...(password !== undefined ? { passwordHash: await hash(password, 10) } : {}) };
  try {
    const captain = await prisma.user.update({
      // Include the role in the mutation itself: no arbitrary staff-account resets.
      where: { id, role: "CAPTAIN" }, data,
      select: { id: true, name: true, email: true, isActive: true },
    });
    events.emit("trip-change");
    return { success: true, captain, message: password !== undefined ? "تم تعيين كلمة المرور الجديدة للكابتن." : "تم تحديث حساب الكابتن." };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2025") throw new CaptainAccountError("حساب الكابتن غير موجود.", 404);
    if (code === "P2002") throw new CaptainAccountError("البريد الإلكتروني مستخدم في حساب آخر.", 409);
    throw error;
  }
}

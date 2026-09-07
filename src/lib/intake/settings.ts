import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canChangeIntake } from "@/lib/permissions";
import { requirePermission } from "./server";
import { IntakeError, objectInput, versionInput } from "./validation";

export async function intakeCapabilities(role: string) {
  const settings = await prisma.intakeSettings.findUniqueOrThrow({ where: { id: "default" } });
  return { captainCanChangeAvailability: settings.captainCanChangeAvailability,
    settingsVersion: settings.version,
    canChangeAvailability: canChangeIntake(role, settings.captainCanChangeAvailability),
    canChangeAreaAvailability: canChangeIntake(role, settings.captainCanChangeAvailability, true) };
}

export async function lockCaptainPermission(tx: Prisma.TransactionClient, role: string) {
  if (role !== "CAPTAIN") return;
  // Revocation and captain mutations serialize against the same persistent setting.
  const settings = await tx.$queryRaw<{ captainCanChangeAvailability: boolean }[]>`
    SELECT "captainCanChangeAvailability" FROM "IntakeSettings" WHERE id = 'default' FOR SHARE`;
  if (!settings[0]?.captainCanChangeAvailability) throw new IntakeError("الإدارة لم تسمح لك بتغيير استقبال الطلبات حاليًا.", 403);
}

export async function updateCaptainPermission(input: unknown) {
  const user = await requirePermission("Routes.ConfigureCaptain");
  const data = objectInput(input);
  if (typeof data.captainCanChangeAvailability !== "boolean") throw new IntakeError("قيمة الصلاحية غير صحيحة.");
  const version = versionInput(data.version);
  const result = await prisma.intakeSettings.updateMany({ where: { id: "default", version }, data: {
    captainCanChangeAvailability: data.captainCanChangeAvailability, updatedBy: user.id, version: { increment: 1 },
  } });
  if (!result.count) throw new IntakeError("تم تعديل الإعداد من مستخدم آخر. راجع الحالة الحالية وحاول مجددًا.", 409);
  return { success: true };
}

export async function changeAreaAvailability(id: string, input: unknown) {
  const user = await requirePermission("Routes.ChangeAreaAvailability");
  const data = objectInput(input);
  if (typeof data.isActive !== "boolean") throw new IntakeError("حالة المنطقة غير صحيحة.");
  const version = versionInput(data.version);
  return prisma.$transaction(async tx => {
    await lockCaptainPermission(tx, user.role);
    const result = await tx.area.updateMany({ where: { id, availabilityVersion: version },
      data: { isActive: data.isActive as boolean, availabilityVersion: { increment: 1 } } });
    if (!result.count) throw new IntakeError("تم تغيير المنطقة من مستخدم آخر. راجع حالتها الحالية.", 409);
    return { success: true };
  });
}

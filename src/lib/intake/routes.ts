import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./server";
import { lockCaptainPermission } from "./settings";
import { IntakeError, objectInput, versionInput, textInput } from "./validation";

const includeAreas = { fromArea: true, toArea: true } as const;
export async function listRoutes(publicOnly = false) {
  if (!publicOnly) await requirePermission("Routes.View");
  return prisma.route.findMany({
    where: publicOnly ? { isOpen: true, isActive: true,
      fromArea: { isActive: true, nameAr: { not: null } }, toArea: { isActive: true, nameAr: { not: null } } } : {},
    include: includeAreas,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

// SHARE locks conflict with updates to availability/activation, even from legacy handlers.
// Lock areas in a stable order before the route to avoid deadlocks between opposite routes.
export async function lockRoute(tx: Prisma.TransactionClient, id: string, publicOnly: boolean) {
  const definition = await tx.route.findUnique({ where: { id } });
  if (!definition) throw new IntakeError("المسار غير موجود.", 404);
  await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" IN (${definition.fromAreaId}, ${definition.toAreaId}) ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "Route" WHERE "id" = ${id} FOR SHARE`;
  const route = await tx.route.findUnique({ where: { id }, include: includeAreas });
  if (!route || route.fromAreaId !== definition.fromAreaId || route.toAreaId !== definition.toAreaId)
    throw new IntakeError("تم تعديل المسار. يرجى المحاولة مجددًا.", 409);
  if (!route.isActive || !route.fromArea.isActive || !route.toArea.isActive || !route.fromArea.nameAr || !route.toArea.nameAr)
    throw new IntakeError("هذا المسار غير متاح حاليًا.", 409);
  if (publicOnly && !route.isOpen)
    throw new IntakeError("تم إغلاق استقبال الطلبات لهذا المسار منذ قليل. يرجى اختيار أحد المسارات المتاحة حاليًا.", 409);
  return route;
}

export async function changeAvailability(id: string, input: unknown) {
  const user = await requirePermission("Routes.ChangeAvailability");
  const data = objectInput(input);
  if (typeof data.isOpen !== "boolean") throw new IntakeError("حالة استقبال الطلبات غير صحيحة.");
  const version = versionInput(data.version);
  return prisma.$transaction(async tx => {
    await lockCaptainPermission(tx, user.role);
    // No lock upgrade: opening validates areas under share locks, then updates the route.
    const route = await tx.route.findUnique({ where: { id } });
    if (!route) throw new IntakeError("المسار غير موجود.", 404);
    await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" IN (${route.fromAreaId}, ${route.toAreaId}) ORDER BY "id" FOR SHARE`;
    const areas = await tx.area.findMany({ where: { id: { in: [route.fromAreaId, route.toAreaId] } } });
    if (data.isOpen && areas.some(a => !a.isActive || !a.nameAr)) throw new IntakeError("يجب تفعيل المناطق وإضافة أسمائها العربية أولًا.", 409);
    const result = await tx.route.updateMany({ where: { id, availabilityVersion: version, ...(data.isOpen ? { isActive: true } : {}) },
      data: { isOpen: data.isOpen as boolean, availabilityVersion: { increment: 1 }, availabilityChangedAt: new Date(), availabilityChangedBy: user.id } });
    if (!result.count) throw new IntakeError("تم تعديل المسار من مستخدم آخر أو تم تعطيله. راجع حالته الحالية وحاول مجددًا.", 409);
    return { success: true };
  });
}

export async function manageArea(id: string | null, input: unknown) {
  await requirePermission("Routes.Manage");
  const data = objectInput(input);
  const nameAr = textInput(data.nameAr, "اسم المنطقة بالعربية", 80);
  if (!/[\u0600-\u06ff]/.test(nameAr)) throw new IntakeError("يرجى إدخال اسم المنطقة بالعربية.");
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") throw new IntakeError("حالة المنطقة غير صحيحة.");
  if (!id) return prisma.area.create({ data: { name: nameAr, nameAr } });
  return prisma.area.update({ where: { id }, data: { nameAr, ...(data.isActive !== undefined ? { isActive: data.isActive as boolean } : {}) } });
}

export async function manageRoute(id: string | null, input: unknown) {
  await requirePermission("Routes.Manage");
  const data = objectInput(input);
  const requireSenderPhone = data.requireSenderPhone !== undefined ? Boolean(data.requireSenderPhone) : undefined;
  const requireReceiverPhone = data.requireReceiverPhone !== undefined ? Boolean(data.requireReceiverPhone) : undefined;

  if (id) {
    if (data.isActive !== undefined && typeof data.isActive !== "boolean") throw new IntakeError("حالة المسار غير صحيحة.");
    if (data.price !== undefined && (typeof data.price !== "number" || !Number.isFinite(data.price) || data.price < 0)) throw new IntakeError("يرجى إدخال سعر صحيح للمسار.");
    return prisma.$transaction(async tx => {
      const current = await tx.route.findUnique({ where: { id } });
      if (!current) throw new IntakeError("المسار غير موجود.", 404);
      const fromAreaId = data.fromAreaId === undefined ? current.fromAreaId : textInput(data.fromAreaId, "منطقة الاستلام", 100);
      const toAreaId = data.toAreaId === undefined ? current.toAreaId : textInput(data.toAreaId, "منطقة التسليم", 100);
      await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" IN (${current.fromAreaId}, ${current.toAreaId}, ${fromAreaId}, ${toAreaId}) ORDER BY "id" FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "Route" WHERE "id" = ${id} FOR UPDATE`;
      if (fromAreaId !== current.fromAreaId || toAreaId !== current.toAreaId) {
        if (await tx.order.count({ where: { routeId: id } }) || await tx.tripRecord.count({ where: { routeId: id } }))
          throw new IntakeError("هذا المسار مرتبط بطلبات أو مشاوير. أضف مسارًا جديدًا للحفاظ على السجل.", 409);
      }
      return tx.route.update({ where: { id }, data: { fromAreaId, toAreaId,
        ...(requireSenderPhone !== undefined ? { requireSenderPhone } : {}),
        ...(requireReceiverPhone !== undefined ? { requireReceiverPhone } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive as boolean } : {}),
        ...(data.price !== undefined ? { price: data.price as number } : {}),
        isOpen: false, availabilityVersion: { increment: 1 } } });
    });
  }
  const fromAreaId = textInput(data.fromAreaId, "منطقة الاستلام", 100);
  const toAreaId = textInput(data.toAreaId, "منطقة التسليم", 100);
  if (typeof data.price !== "number" || !Number.isFinite(data.price) || data.price < 0) throw new IntakeError("يرجى إدخال سعر صحيح للمسار.");
  return prisma.route.create({ data: {
    fromAreaId, toAreaId, price: data.price,
    requireSenderPhone: requireSenderPhone ?? true,
    requireReceiverPhone: requireReceiverPhone ?? true,
  } });
}

export async function listAreas() {
  await requirePermission("Routes.Manage");
  return prisma.area.findMany({ orderBy: { name: "asc" } });
}

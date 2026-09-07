import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "./server";
import { lockRoute } from "./routes";
import { IntakeError, objectInput, orderInput, textInput, versionInput } from "./validation";

export async function createOrder(input: unknown, publicOnly: boolean) {
  const user = publicOnly ? null : await requirePermission("Orders.Create");
  const data = orderInput(input);
  const raw = objectInput(input);
  const key = textInput(raw.requestKey, "رمز الطلب", 80);
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new IntakeError("رمز الطلب غير صحيح.");
  // Namespace internal retries by actor. Only acknowledge public retries; never return PII.
  const requestKey = `${user?.id || "public"}:${key}`;
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.order.findUnique({ where: { requestKey }, select: { id: true } });
      if (existing) return { success: true };
      const route = await lockRoute(tx, data.routeId, publicOnly);
      await tx.order.create({ data: { ...data, requestKey,
        fromAreaName: route.fromArea.nameAr!, toAreaName: route.toArea.nameAr!,
        source: publicOnly ? "PUBLIC" : "INTERNAL", createdBy: user?.id, updatedBy: user?.id } });
      return { success: true };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002" && await prisma.order.findUnique({ where: { requestKey }, select: { id: true } })) return { success: true };
    throw error;
  }
}

export async function listOrders(history: boolean, cursor?: string) {
  const user = await requirePermission(history ? "Orders.ViewHistory" : "Orders.View");
  const orders = await prisma.order.findMany({
    where: { status: history ? { in: ["COMPLETED", "CANCELLED"] } : "ACTIVE" },
    orderBy: [{ createdAt: history ? "desc" : "asc" }, { id: history ? "desc" : "asc" }],
    ...(history ? { take: 50, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) } : {}),
    // Do not serialize retry keys or internal audit actor identifiers.
    select: { id: true, routeId: true, fromAreaName: true, toAreaName: true,
      pickupBuilding: true, senderPhone: true, deliveryBuilding: true, receiverPhone: true,
      notes: true, status: true, version: true, createdAt: true, completedAt: true, cancelledAt: true, source: true },
  });
  return { orders, role: user.role, nextCursor: history && orders.length === 50 ? orders[49].id : null };
}

export async function updateOrder(id: string, input: unknown) {
  const data = objectInput(input);
  const action = data.action;
  if (!["edit", "complete", "cancel"].includes(action as string)) throw new IntakeError("الإجراء غير صحيح.");
  const user = await requirePermission(action === "edit" ? "Orders.Edit" : action === "complete" ? "Orders.Complete" : "Orders.Cancel");
  const version = versionInput(data.version);
  return prisma.$transaction(async tx => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new IntakeError("الطلب غير موجود.", 404);
    if (existing.version !== version) throw new IntakeError("تم تعديل الطلب من مستخدم آخر. راجع البيانات الحالية وحاول مجددًا.", 409);
    if (existing.status !== "ACTIVE" && !(action === "edit" && hasPermission(user.role, "Orders.EditArchive")))
      throw new IntakeError("هذا الطلب لم يعد نشطًا.", 409);
    let changes;
    if (action === "edit") {
      const fields = orderInput(data);
      // Existing orders remain editable if intake or structural availability changes.
      // Their route identity and snapshot stay fixed; accepting a different route is a new order.
      if (fields.routeId !== existing.routeId) throw new IntakeError("لا يمكن تغيير مسار طلب مسجل. يمكنك إلغاء الطلب وإضافة طلب جديد.");
      changes = fields;
    } else {
      changes = action === "complete" ? { status: "COMPLETED" as const, completedAt: new Date(), completedBy: user.id }
        : { status: "CANCELLED" as const, cancelledAt: new Date(), cancelledBy: user.id };
    }
    const result = await tx.order.updateMany({ where: { id, version, status: existing.status },
      data: { ...changes, updatedBy: user.id, version: { increment: 1 } } });
    if (!result.count) throw new IntakeError("تم تعديل الطلب من مستخدم آخر. يرجى مراجعة حالته الحالية.", 409);
    return { success: true };
  });
}

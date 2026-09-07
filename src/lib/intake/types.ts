export interface IntakeArea { id: string; name: string; nameAr: string | null; isActive: boolean }
export interface IntakeRoute {
  id: string; fromAreaId: string; toAreaId: string;
  fromArea: IntakeArea; toArea: IntakeArea;
  isOpen: boolean; isActive: boolean; availabilityVersion: number;
  price?: number;
}
export interface OrderInput {
  routeId: string; pickupBuilding: string; senderPhone: string;
  deliveryBuilding: string; receiverPhone: string; notes: string;
}
export interface OrderView extends OrderInput {
  id: string; fromAreaName: string; toAreaName: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  version: number; createdAt: string; completedAt: string | null;
  cancelledAt: string | null; source: string;
}
export const areaLabel = (area: IntakeArea) => area.nameAr || "منطقة بدون اسم عربي";
export const routeLabel = (route: IntakeRoute) => `من ${areaLabel(route.fromArea)} إلى ${areaLabel(route.toArea)}`;
export const statusLabels = { ACTIVE: "نشط", COMPLETED: "مكتمل", CANCELLED: "ملغي" };

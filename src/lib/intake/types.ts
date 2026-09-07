export interface IntakeArea { id: string; name: string; nameAr: string | null; isActive: boolean; availabilityVersion: number }
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
  trackingNumber: string; cancellationNote: string | null;
}
export interface OrderReceipt { success: boolean; trackingNumber: string }
export interface TrackingView {
  trackingNumber: string; status: OrderView["status"]; createdAt: string;
  completedAt: string | null; cancelledAt: string | null; cancellationNote: string | null;
}
export interface IntakeControls {
  routes: IntakeRoute[]; areas: IntakeArea[]; role: string;
  captainCanChangeAvailability: boolean; settingsVersion: number;
  canChangeAvailability: boolean; canChangeAreaAvailability: boolean;
}
export const trackingLabel = (number: string) => number.match(/.{1,8}/g)?.join("-") || number;
export const customerStatusLabels = { ACTIVE: "تم استقبال طلبك", COMPLETED: "تم التوصيل", CANCELLED: "تم إلغاء الطلب" };
export const areaLabel = (area: IntakeArea) => area.nameAr || "منطقة بدون اسم عربي";
export const routeLabel = (route: IntakeRoute) => `من ${areaLabel(route.fromArea)} إلى ${areaLabel(route.toArea)}`;
export const statusLabels = { ACTIVE: "نشط", COMPLETED: "مكتمل", CANCELLED: "ملغي" };

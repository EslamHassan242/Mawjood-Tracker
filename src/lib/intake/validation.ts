import type { OrderInput } from "./types";

export class IntakeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new IntakeError("بيانات الطلب غير صحيحة.");
  return value as Record<string, unknown>;
}
export function textInput(value: unknown, label: string, max: number, optional = false): string {
  if (optional && value === undefined) return "";
  if (typeof value !== "string" || (!optional && !value.trim()) || value.trim().length > max)
    throw new IntakeError(`يرجى إدخال ${label} بشكل صحيح (بحد أقصى ${max} حرفًا).`);
  return value.trim();
}
export function phoneInput(value: unknown, label: string): string {
  const phone = textInput(value, label, 30).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[\s()-]/g, "");
  if (!/^\+?[0-9]{8,15}$/.test(phone)) throw new IntakeError(`يرجى إدخال ${label} بشكل صحيح.`);
  return phone;
}
export function orderInput(value: unknown): OrderInput {
  const data = objectInput(value);
  return {
    routeId: textInput(data.routeId, "المسار", 100),
    pickupBuilding: textInput(data.pickupBuilding, "رقم عمارة الاستلام", 80),
    senderPhone: phoneInput(data.senderPhone, "رقم هاتف الراسل"),
    deliveryBuilding: textInput(data.deliveryBuilding, "رقم عمارة التسليم", 80),
    receiverPhone: phoneInput(data.receiverPhone, "رقم هاتف المستلم"),
    notes: textInput(data.notes, "الملاحظات", 1000, true),
  };
}
export function versionInput(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new IntakeError("يرجى تحديث بيانات الصفحة والمحاولة مجددًا.");
  return value as number;
}

export function trackingInput(value: unknown): string {
  const number = textInput(value, "رقم متابعة الطلب", 50).replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(number)) throw new IntakeError("يرجى إدخال رقم المتابعة كاملًا كما ظهر بعد تسجيل الطلب.");
  return number;
}

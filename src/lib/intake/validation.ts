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
export function phoneInput(value: unknown, label: string, optional = false): string {
  if (optional && (!value || (typeof value === "string" && !value.trim()))) return "";
  let phone = textInput(value, label, 30, optional)
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776))
    .replace(/[\s()-]/g, "");
  if (!phone) {
    if (optional) return "";
    throw new IntakeError(`يرجى إدخال ${label}.`);
  }
  // Strip leading international prefix +20 or 0020
  if (phone.startsWith("+20")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("0020")) phone = "0" + phone.slice(4);
  else if (phone.startsWith("20") && phone.length === 12) phone = "0" + phone.slice(2);
  
  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    throw new IntakeError(`يرجى إدخال ${label} بشكل صحيح (رقم محمول مصري مكون من 11 رقمًا يبتدئ بـ 010/011/012/015).`);
  }
  return phone;
}
export function orderInput(value: unknown, routeConfig?: { requireSenderPhone?: boolean; requireReceiverPhone?: boolean }): OrderInput {
  const data = objectInput(value);
  const requireSender = routeConfig?.requireSenderPhone !== false;
  const requireReceiver = routeConfig?.requireReceiverPhone !== false;
  return {
    routeId: textInput(data.routeId, "المسار", 100),
    pickupBuilding: textInput(data.pickupBuilding, "مكان الاستلام", 80),
    senderPhone: phoneInput(data.senderPhone, "رقم هاتف الراسل", !requireSender),
    deliveryBuilding: textInput(data.deliveryBuilding, "مكان التسليم", 80),
    receiverPhone: phoneInput(data.receiverPhone, "رقم هاتف المستلم", !requireReceiver),
    notes: textInput(data.notes, "الملاحظات", 1000, true),
  };
}
export function versionInput(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new IntakeError("يرجى تحديث بيانات الصفحة والمحاولة مجددًا.");
  return value as number;
}

export function trackingInput(value: unknown): string {
  const number = textInput(value, "رقم متابعة الطلب", 50)
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776))
    .replace(/[\s-]/g, "")
    .toUpperCase();
  if (number.length < 4 || number.length > 50 || !/^[A-Z0-9]+$/.test(number)) {
    throw new IntakeError("يرجى إدخال رقم متابعة الطلب بشكل صحيح.");
  }
  return number;
}

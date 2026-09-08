export class CaptainAccountError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function captainAccountInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CaptainAccountError("بيانات الحساب غير صحيحة.");
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !["name", "email", "isActive", "password"].includes(key)))
    throw new CaptainAccountError("يمكن تعديل بيانات الكابتن فقط دون تغيير صلاحيات الحساب.");
  const data: { name?: string; email?: string; isActive?: boolean; password?: string } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) throw new CaptainAccountError("يرجى إدخال اسم صحيح لا يزيد عن ١٠٠ حرف.");
    data.name = body.name.trim();
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || body.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
      throw new CaptainAccountError("يرجى إدخال بريد إلكتروني صحيح.");
    data.email = body.email.trim();
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") throw new CaptainAccountError("حالة الحساب غير صحيحة.");
    data.isActive = body.isActive;
  }
  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.trim().length < 8 || new TextEncoder().encode(body.password).length > 72)
      throw new CaptainAccountError("كلمة المرور يجب أن تكون ٨ أحرف على الأقل، وبحد أقصى ٧٢ بايت.");
    data.password = body.password;
  }
  if (!Object.keys(data).length) throw new CaptainAccountError("لم يتم إرسال أي تعديل.");
  return data;
}

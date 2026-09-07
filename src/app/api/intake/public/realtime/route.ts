import { publicRealtimeConfig } from "@/lib/intake/realtime-config";
export const dynamic = "force-dynamic";
export async function GET() {
  // Read the server runtime environment instead of relying on an old browser bundle.
  const environment = process.env;
  const config = publicRealtimeConfig(environment);
  return Response.json(config || { error: "التحديث المباشر غير مهيأ حاليًا. يرجى التواصل مع الإدارة." },
    { status: config ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

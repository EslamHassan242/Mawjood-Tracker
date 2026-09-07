import { listRoutes } from "@/lib/intake/routes";
import { apiResult, requirePermission } from "@/lib/intake/server";
export const dynamic = "force-dynamic";
export async function GET() { return apiResult(async () => {
  const user = await requirePermission("Routes.View");
  return { routes: await listRoutes(), role: user.role };
}); }


import { listRoutes } from "@/lib/intake/routes";
import { apiResult, requirePermission } from "@/lib/intake/server";
import { intakeCapabilities } from "@/lib/intake/settings";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() { return apiResult(async () => {
  const user = await requirePermission("Routes.View");
  return { routes: await listRoutes(), areas: await prisma.area.findMany({ orderBy: { name: "asc" } }),
    role: user.role, ...await intakeCapabilities(user.role) };
}); }

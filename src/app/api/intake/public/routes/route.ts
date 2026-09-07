import { listRoutes } from "@/lib/intake/routes";
import { apiResult } from "@/lib/intake/server";
export const dynamic = "force-dynamic";
export async function GET() { return apiResult(async () => ({
  routes: (await listRoutes(true)).map(r => ({
    id: r.id, fromArea: { id: r.fromArea.id, nameAr: r.fromArea.nameAr },
    toArea: { id: r.toArea.id, nameAr: r.toArea.nameAr }, isOpen: true, isActive: true,
  })),
})); }


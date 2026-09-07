import { listAreas, listRoutes, manageArea, manageRoute } from "@/lib/intake/routes";
import { apiResult, readBody, requirePermission } from "@/lib/intake/server";
import { objectInput, textInput } from "@/lib/intake/validation";
export const dynamic = "force-dynamic";
export async function GET() { return apiResult(async () => {
  await requirePermission("Routes.Manage");
  return { areas: await listAreas(), routes: await listRoutes() };
}); }
export async function POST(request: Request) { return apiResult(async () => {
  const data = objectInput(await readBody(request));
  return data.kind === "area" ? manageArea(null, data) : manageRoute(null, data);
}); }
export async function PATCH(request: Request) { return apiResult(async () => {
  const data = objectInput(await readBody(request));
  const id = textInput(data.id, "المعرف", 100);
  return data.kind === "area" ? manageArea(id, data) : manageRoute(id, data);
}); }


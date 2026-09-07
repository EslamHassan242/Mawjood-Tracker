import { changeAvailability } from "@/lib/intake/routes";
import { apiResult, readBody } from "@/lib/intake/server";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => changeAvailability((await context.params).id, await readBody(request)));
}


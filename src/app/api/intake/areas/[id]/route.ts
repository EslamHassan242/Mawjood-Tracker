import { changeAreaAvailability } from "@/lib/intake/settings";
import { apiResult, readBody } from "@/lib/intake/server";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => changeAreaAvailability((await context.params).id, await readBody(request)));
}

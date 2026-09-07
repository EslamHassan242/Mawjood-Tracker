import { updateCaptainPermission } from "@/lib/intake/settings";
import { apiResult, readBody } from "@/lib/intake/server";
export async function PATCH(request: Request) {
  return apiResult(async () => updateCaptainPermission(await readBody(request)));
}

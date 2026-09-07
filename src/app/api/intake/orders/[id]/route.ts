import { updateOrder } from "@/lib/intake/orders";
import { apiResult, readBody } from "@/lib/intake/server";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => updateOrder((await context.params).id, await readBody(request)));
}


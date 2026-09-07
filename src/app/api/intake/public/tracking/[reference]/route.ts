import { trackOrder } from "@/lib/intake/orders";
import { apiResult } from "@/lib/intake/server";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  return apiResult(async () => trackOrder((await context.params).reference));
}

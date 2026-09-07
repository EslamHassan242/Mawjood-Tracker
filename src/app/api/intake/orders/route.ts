import { createOrder, listOrders } from "@/lib/intake/orders";
import { apiResult, readBody } from "@/lib/intake/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return apiResult(() => listOrders(params.get("history") === "true", params.get("cursor") || undefined));
}
export async function POST(request: Request) { return apiResult(async () => createOrder(await readBody(request), false)); }


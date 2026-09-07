import { createOrder } from "@/lib/intake/orders";
import { apiResult, readBody } from "@/lib/intake/server";
export async function POST(request: Request) { return apiResult(async () => createOrder(await readBody(request), true)); }


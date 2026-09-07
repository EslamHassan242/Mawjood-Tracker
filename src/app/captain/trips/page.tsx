import { prisma } from "@/lib/prisma";
import CaptainHomeClient from "@/components/captain/CaptainHomeClient";
export const dynamic = "force-dynamic";
export default async function CaptainTripsPage() {
  const routes = await prisma.route.findMany({
    where: { isActive: true }, include: { fromArea: true, toArea: true },
    orderBy: [{ sortOrder: "asc" }, { fromArea: { name: "asc" } }, { toArea: { name: "asc" } }],
  });
  return <CaptainHomeClient initialRoutes={routes} />;
}

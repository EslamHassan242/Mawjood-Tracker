import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role || "";
  if (isAdminRole(role)) {
    redirect("/admin");
  } else {
    redirect("/captain/orders");
  }
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/captain");
  }
}

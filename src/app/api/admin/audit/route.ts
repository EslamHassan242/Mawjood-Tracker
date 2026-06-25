import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// GET /api/admin/audit - Retrieve filtered audit logs (Admin only)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const captainId = searchParams.get("captainId");
    const actionType = searchParams.get("actionType");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build Prisma query filter
    const where: any = {};

    if (captainId && captainId !== "all") {
      where.userId = captainId;
    }

    if (actionType && actionType !== "all") {
      where.actionType = actionType;
    }

    if (startDateParam && endDateParam) {
      where.timestamp = {
        gte: startOfDay(new Date(startDateParam)),
        lte: endOfDay(new Date(endDateParam)),
      };
    } else if (startDateParam) {
      where.timestamp = {
        gte: startOfDay(new Date(startDateParam)),
      };
    } else if (endDateParam) {
      where.timestamp = {
        lte: endOfDay(new Date(endDateParam)),
      };
    }

    // Fetch audit logs
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/audit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

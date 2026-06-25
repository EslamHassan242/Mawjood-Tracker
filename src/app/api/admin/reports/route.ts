import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { canView } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canView(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const captainId = searchParams.get("captainId");
    const routeId = searchParams.get("routeId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build Prisma query filters dynamically
    const whereClause: any = {
      status: "ACTIVE", // Only active trips
    };

    if (captainId && captainId !== "all") {
      whereClause.captainId = captainId;
    }

    if (routeId && routeId !== "all") {
      whereClause.routeId = routeId;
    }

    if (startDateParam && endDateParam) {
      whereClause.createdAt = {
        gte: startOfDay(new Date(startDateParam)),
        lte: endOfDay(new Date(endDateParam)),
      };
    } else if (startDateParam) {
      whereClause.createdAt = {
        gte: startOfDay(new Date(startDateParam)),
      };
    } else if (endDateParam) {
      whereClause.createdAt = {
        lte: endOfDay(new Date(endDateParam)),
      };
    }

    // Query matching trips
    const trips = await prisma.tripRecord.findMany({
      where: whereClause,
      include: {
        captain: {
          select: {
            name: true,
            email: true,
          },
        },
        route: {
          include: {
            fromArea: true,
            toArea: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalTrips = trips.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + trip.ordersCount, 0);
    const totalRevenue = trips.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + (trip.unitPrice * trip.ordersCount), 0);

    // Grouped route breakdown
    const routeBreakdownMap: {
      [key: string]: {
        fromArea: string;
        toArea: string;
        tripsCount: number;
        revenue: number;
      };
    } = {};

    trips.forEach((trip) => {
      const rId = trip.routeId;
      if (!routeBreakdownMap[rId]) {
        routeBreakdownMap[rId] = {
          fromArea: trip.route.fromArea.name,
          toArea: trip.route.toArea.name,
          tripsCount: 0,
          revenue: 0,
        };
      }
      routeBreakdownMap[rId].tripsCount += trip.ordersCount;
      routeBreakdownMap[rId].revenue += (trip.unitPrice * trip.ordersCount);
    });

    const routeBreakdown = Object.values(routeBreakdownMap).sort(
      (a, b) => b.tripsCount - a.tripsCount
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalTrips,
        totalRevenue,
        routeBreakdown,
      },
      trips,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

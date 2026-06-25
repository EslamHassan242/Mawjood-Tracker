import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";

// GET /api/trips - List trips for the authenticated captain
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const captainId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "today"; // today | yesterday | custom
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    let start = startOfDay(new Date());
    let end = endOfDay(new Date());

    if (filter === "yesterday") {
      const yesterday = subDays(new Date(), 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
    } else if (filter === "custom" && startDateParam && endDateParam) {
      start = startOfDay(new Date(startDateParam));
      end = endOfDay(new Date(endDateParam));
    }

    const trips = await prisma.tripRecord.findMany({
      where: {
        captainId,
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(includeDeleted ? {} : { status: "ACTIVE" }),
      },
      include: {
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

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Error in GET /api/trips:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/trips - Record a new trip
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const captainId = (session.user as any).id;
    const body = await request.json();
    const { routeId, ordersCount } = body;

    if (!routeId) {
      return NextResponse.json({ error: "Missing routeId" }, { status: 400 });
    }

    // Find route to verify it exists and get its current price
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        fromArea: true,
        toArea: true,
      },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    if (!route.isActive) {
      return NextResponse.json({ error: "Route is inactive" }, { status: 400 });
    }

    const count = typeof ordersCount === "number" && ordersCount > 0 ? ordersCount : 1;

    // Create the trip record, snapping the price
    const trip = await prisma.tripRecord.create({
      data: {
        captainId,
        routeId,
        unitPrice: route.price,
        ordersCount: count,
        status: "ACTIVE",
      },
      include: {
        route: {
          include: {
            fromArea: true,
            toArea: true,
          },
        },
        captain: true,
      },
    });

    // Create immutable audit log entry
    await prisma.auditLog.create({
      data: {
        actionType: "ENTRY_CREATED",
        userId: captainId,
        captainName: trip.captain.name,
        routeInfo: `${route.fromArea.name} → ${route.toArea.name}`,
        ordersCount: count,
        amount: route.price * count,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trip recorded successfully",
      trip,
    });
  } catch (error) {
    console.error("Error in POST /api/trips:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

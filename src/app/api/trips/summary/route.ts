import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const captainId = (session.user as any).id;
    
    // Get start and end of the current day
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    // Query today's active trips
    const todayTrips = await prisma.tripRecord.findMany({
      where: {
        captainId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: "ACTIVE", // Only count active trips
      },
      select: {
        unitPrice: true,
        ordersCount: true,
      },
    });

    const tripsCount = todayTrips.reduce((acc, trip) => acc + trip.ordersCount, 0);
    const revenue = todayTrips.reduce((acc, trip) => acc + (trip.unitPrice * trip.ordersCount), 0);

    return NextResponse.json({
      success: true,
      tripsCount,
      revenue,
    });
  } catch (error) {
    console.error("Error in GET /api/trips/summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { canView } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canView(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Dates
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    // 1. Total Captains
    const totalCaptains = await prisma.user.count({
      where: {
        role: "CAPTAIN",
        isActive: true,
      },
    });

    // 2 & 3. Today's Trips & Revenue
    const todayTripsData = await prisma.tripRecord.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: "ACTIVE",
      },
      select: {
        unitPrice: true,
        ordersCount: true,
      },
    });
    const todayTrips = todayTripsData.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + trip.ordersCount, 0);
    const todayRevenue = todayTripsData.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + (trip.unitPrice * trip.ordersCount), 0);
 
    // 4. This Month Revenue
    const monthTripsData = await prisma.tripRecord.findMany({
      where: {
        createdAt: {
          gte: monthStart,
        },
        status: "ACTIVE",
      },
      select: {
        unitPrice: true,
        ordersCount: true,
      },
    });
    const monthRevenue = monthTripsData.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + (trip.unitPrice * trip.ordersCount), 0);

    return NextResponse.json({
      success: true,
      totalCaptains,
      todayTrips,
      todayRevenue,
      monthRevenue,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/dashboard:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

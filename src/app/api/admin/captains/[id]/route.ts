import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { events } from "@/lib/events";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
} from "date-fns";
import { canView, canWrite, canDelete } from "@/lib/permissions";

// GET /api/admin/captains/[id] - Get captain details and stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canView(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: captainId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "today"; // today | yesterday | last7 | last30 | custom
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Verify captain exists
    const captain = await prisma.user.findUnique({
      where: { id: captainId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!captain) {
      return NextResponse.json({ error: "Captain not found" }, { status: 404 });
    }

    // Determine date range
    let start = startOfDay(new Date());
    let end = endOfDay(new Date());

    if (filter === "yesterday") {
      const yesterday = subDays(new Date(), 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
    } else if (filter === "last7") {
      start = startOfDay(subDays(new Date(), 7));
      end = endOfDay(new Date());
    } else if (filter === "last30") {
      start = startOfDay(subDays(new Date(), 30));
      end = endOfDay(new Date());
    } else if (filter === "custom" && startDateParam && endDateParam) {
      start = startOfDay(new Date(startDateParam));
      end = endOfDay(new Date(endDateParam));
    }

    // 1. Fetch active trips in range
    const trips = await prisma.tripRecord.findMany({
      where: {
        captainId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: "ACTIVE",
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

    const totalTrips = trips.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + trip.ordersCount, 0);
    const totalRevenue = trips.reduce<number>((sum, trip: { ordersCount: number; unitPrice: number }) => sum + (trip.unitPrice * trip.ordersCount), 0);

    // 2. Aggregate route breakdown
    const routeBreakdownMap: {
      [key: string]: {
        fromArea: string;
        toArea: string;
        tripsCount: number;
        revenue: number;
      };
    } = {};

    trips.forEach((trip) => {
      const routeId = trip.routeId;
      if (!routeBreakdownMap[routeId]) {
        routeBreakdownMap[routeId] = {
          fromArea: trip.route.fromArea.name,
          toArea: trip.route.toArea.name,
          tripsCount: 0,
          revenue: 0,
        };
      }
      routeBreakdownMap[routeId].tripsCount += trip.ordersCount;
      routeBreakdownMap[routeId].revenue += (trip.unitPrice * trip.ordersCount);
    });

    const routeBreakdown = Object.values(routeBreakdownMap).sort(
      (a, b) => b.tripsCount - a.tripsCount
    );

    return NextResponse.json({
      success: true,
      captain,
      stats: {
        totalTrips,
        totalRevenue,
        routeBreakdown,
        history: trips,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/captains/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/admin/captains/[id] - Update captain profile
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canWrite(role)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const { id: captainId } = await params;
    const body = await request.json();
    const { name, email, password, isActive } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (typeof isActive === "boolean") dataToUpdate.isActive = isActive;
    
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: captainId },
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
      }
      dataToUpdate.email = email;
    }

    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedCaptain = await prisma.user.update({
      where: { id: captainId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: true,
      },
    });

    // Emit real-time operational change event to update stats
    events.emit("trip-change");

    return NextResponse.json({
      success: true,
      message: "Captain account updated successfully",
      captain: updatedCaptain,
    });
  } catch (error) {
    console.error("Error in PATCH /api/admin/captains/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/admin/captains/[id] - Hard-delete captain account and all associated history
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canDelete(role)) {
      return NextResponse.json({ error: "Forbidden: Only Super Admins can delete captains" }, { status: 403 });
    }

    const { id: captainId } = await params;

    // Hard-delete captain and cascade manually to avoid database foreign key violations
    // 1. Delete associated AuditLog entries
    await prisma.auditLog.deleteMany({
      where: { userId: captainId },
    });

    // 2. Delete associated DeletedTripRecord entries
    // A. Where the trip was deleted by this captain
    await prisma.deletedTripRecord.deleteMany({
      where: { deletedByUserId: captainId },
    });
    // B. Where the trip itself belonged to this captain
    await prisma.deletedTripRecord.deleteMany({
      where: {
        originalTrip: {
          captainId: captainId,
        },
      },
    });

    // 3. Delete associated TripRecord entries
    await prisma.tripRecord.deleteMany({
      where: { captainId: captainId },
    });

    // 4. Finally, delete the User record
    await prisma.user.delete({
      where: { id: captainId },
    });

    // Emit real-time operational change event to update dashboard
    events.emit("trip-change");

    return NextResponse.json({
      success: true,
      message: "Captain account and all history permanently deleted",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/captains/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

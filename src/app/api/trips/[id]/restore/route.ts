import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/trips/[id]/restore - Restore a soft-deleted trip
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tripId } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Find the trip
    const trip = await prisma.tripRecord.findUnique({
      where: { id: tripId },
      include: {
        captain: true,
        route: {
          include: {
            fromArea: true,
            toArea: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Security check: Captains can only restore their own trips
    if (userRole !== "ADMIN" && trip.captainId !== userId) {
      return NextResponse.json({ error: "Forbidden: You cannot restore other captains' trips" }, { status: 403 });
    }

    if (trip.status !== "DELETED") {
      return NextResponse.json({ error: "Trip is not deleted" }, { status: 400 });
    }

    // Restore the trip (set status to ACTIVE)
    const updatedTrip = await prisma.tripRecord.update({
      where: { id: tripId },
      data: {
        status: "ACTIVE",
      },
    });

    const totalAmount = trip.unitPrice * trip.ordersCount;

    // Create immutable audit log
    await prisma.auditLog.create({
      data: {
        actionType: "ENTRY_RESTORED",
        userId,
        captainName: trip.captain.name,
        routeInfo: `${trip.route.fromArea.name} → ${trip.route.toArea.name}`,
        ordersCount: trip.ordersCount,
        amount: totalAmount,
        newValues: `Orders: ${trip.ordersCount}, Revenue: ${totalAmount} EGP`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trip restored successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Error in POST /api/trips/[id]/restore:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const captainId = (session.user as any).id;

    // Find the trip record
    const trip = await prisma.tripRecord.findUnique({
      where: { id: tripId },
      include: {
        deletedRecord: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Security check: Only the captain who recorded the trip can undo it
    if (trip.captainId !== captainId) {
      return NextResponse.json({ error: "Unauthorized: You can only undo your own trips" }, { status: 403 });
    }

    // Check if it's already undone
    if (trip.deletedRecord) {
      return NextResponse.json({ error: "Trip has already been undone" }, { status: 400 });
    }

    // Check the 10-second rule (with a small 2-second safety buffer for network latency, making it 12 seconds max)
    const tripAgeMs = Date.now() - new Date(trip.createdAt).getTime();
    if (tripAgeMs > 12000) {
      return NextResponse.json({ error: "Undo period (10 seconds) has expired" }, { status: 400 });
    }

    // Soft-delete the trip: set status to DELETED
    await prisma.tripRecord.update({
      where: { id: tripId },
      data: {
        status: "DELETED",
      },
    });

    // Find route details to log in AuditLog
    const fullTrip = await prisma.tripRecord.findUnique({
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

    if (fullTrip) {
      const totalAmount = fullTrip.unitPrice * fullTrip.ordersCount;
      await prisma.auditLog.create({
        data: {
          actionType: "ENTRY_DELETED",
          userId: captainId,
          captainName: fullTrip.captain.name,
          routeInfo: `${fullTrip.route.fromArea.name} → ${fullTrip.route.toArea.name}`,
          ordersCount: fullTrip.ordersCount,
          amount: totalAmount,
          oldValues: `Orders: ${fullTrip.ordersCount}, Revenue: ${totalAmount} EGP, Reason: Toast Quick Undo`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Trip undone successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/trips/[id]/undo:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

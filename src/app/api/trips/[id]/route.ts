import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/trips/[id] - Edit orders count of a trip
export async function PATCH(
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
    const body = await request.json();
    const { ordersCount } = body;

    if (typeof ordersCount !== "number" || ordersCount <= 0) {
      return NextResponse.json({ error: "ordersCount must be a positive number" }, { status: 400 });
    }

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

    // Security check: Captains can only edit their own trips
    if (userRole !== "ADMIN" && trip.captainId !== userId) {
      return NextResponse.json({ error: "Forbidden: You cannot edit other captains' trips" }, { status: 403 });
    }

    if (trip.status === "DELETED") {
      return NextResponse.json({ error: "Cannot edit a soft-deleted trip" }, { status: 400 });
    }

    const oldOrders = trip.ordersCount;
    const oldAmount = trip.unitPrice * oldOrders;
    const newAmount = trip.unitPrice * ordersCount;

    // Update the trip
    const updatedTrip = await prisma.tripRecord.update({
      where: { id: tripId },
      data: {
        ordersCount,
      },
      include: {
        route: {
          include: {
            fromArea: true,
            toArea: true,
          },
        },
      },
    });

    // Create immutable audit log
    await prisma.auditLog.create({
      data: {
        actionType: "ENTRY_UPDATED",
        userId,
        captainName: trip.captain.name,
        routeInfo: `${trip.route.fromArea.name} → ${trip.route.toArea.name}`,
        ordersCount,
        amount: newAmount,
        oldValues: `Orders: ${oldOrders}, Revenue: ${oldAmount} EGP`,
        newValues: `Orders: ${ordersCount}, Revenue: ${newAmount} EGP`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trip updated successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Error in PATCH /api/trips/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/trips/[id] - Soft-delete a trip
export async function DELETE(
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

    // Security check: Captains can only delete their own trips
    if (userRole !== "ADMIN" && trip.captainId !== userId) {
      return NextResponse.json({ error: "Forbidden: You cannot delete other captains' trips" }, { status: 403 });
    }

    if (trip.status === "DELETED") {
      return NextResponse.json({ error: "Trip is already soft-deleted" }, { status: 400 });
    }

    // Mark as DELETED (soft-delete)
    const updatedTrip = await prisma.tripRecord.update({
      where: { id: tripId },
      data: {
        status: "DELETED",
      },
    });

    const totalAmount = trip.unitPrice * trip.ordersCount;

    // Create immutable audit log
    await prisma.auditLog.create({
      data: {
        actionType: "ENTRY_DELETED",
        userId,
        captainName: trip.captain.name,
        routeInfo: `${trip.route.fromArea.name} → ${trip.route.toArea.name}`,
        ordersCount: trip.ordersCount,
        amount: totalAmount,
        oldValues: `Orders: ${trip.ordersCount}, Revenue: ${totalAmount} EGP`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trip soft-deleted successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    console.error("Error in DELETE /api/trips/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWrite, canDelete } from "@/lib/permissions";

// PATCH /api/admin/routes/[id] - Update route price or status
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

    const { id: routeId } = await params;
    const body = await request.json();
    const { price, isActive } = body;

    const dataToUpdate: any = {};
    
    if (price !== undefined) {
      const routePrice = parseFloat(price);
      if (isNaN(routePrice) || routePrice < 0) {
        return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
      }
      dataToUpdate.price = routePrice;
    }

    if (isActive !== undefined) {
      dataToUpdate.isActive = !!isActive;
    }

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: dataToUpdate,
      include: {
        fromArea: true,
        toArea: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Route updated successfully",
      route: updatedRoute,
    });
  } catch (error) {
    console.error("Error in PATCH /api/admin/routes/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/admin/routes/[id] - Delete a route (SUPER_ADMIN only)
// Query param: ?force=true allows cascade-deleting all associated trips (SUPER_ADMIN only)
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
      return NextResponse.json(
        { error: "Forbidden: Only Super Admins can delete routes" },
        { status: 403 }
      );
    }

    const { id: routeId } = await params;
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    // Check if any trips reference this route
    const referencingTripsCount = await prisma.tripRecord.count({
      where: { routeId },
    });

    if (referencingTripsCount > 0 && !force) {
      return NextResponse.json(
        {
          error: `This route has ${referencingTripsCount} recorded trip(s).`,
          hasTrips: true,
          tripsCount: referencingTripsCount,
        },
        { status: 400 }
      );
    }

    // Force delete: cascade-delete all trip records and referencing logs for this route first
    if (referencingTripsCount > 0 && force) {
      const tripIds = await prisma.tripRecord.findMany({
        where: { routeId },
        select: { id: true },
      });
      const ids = tripIds.map((t) => t.id);

      // Delete any deletedTripRecord entries referencing these trips
      await prisma.deletedTripRecord.deleteMany({
        where: { originalTripId: { in: ids } },
      });

      // Delete the trip records themselves
      await prisma.tripRecord.deleteMany({
        where: { routeId },
      });
    }

    // Now delete the route
    await prisma.route.delete({
      where: { id: routeId },
    });

    return NextResponse.json({
      success: true,
      message: force
        ? `Route and ${referencingTripsCount} associated trip(s) permanently deleted.`
        : "Route deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/routes/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

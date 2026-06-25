import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
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

// DELETE /api/admin/routes/[id] - Delete a route
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id: routeId } = await params;

    // Safety check: check if any trips reference this route
    const referencingTripsCount = await prisma.tripRecord.count({
      where: { routeId },
    });

    if (referencingTripsCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete route because it has ${referencingTripsCount} recorded trip(s). Please deactivate this route instead to prevent captains from selecting it, while preserving historical records.`,
        },
        { status: 400 }
      );
    }

    // Delete route
    await prisma.route.delete({
      where: { id: routeId },
    });

    return NextResponse.json({
      success: true,
      message: "Route deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/routes/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

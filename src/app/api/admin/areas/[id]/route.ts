import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWrite, canDelete } from "@/lib/permissions";

// PATCH /api/admin/areas/[id] - Update/rename an area
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

    const { id: areaId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Area name is required" }, { status: 400 });
    }

    const formattedName = name.trim();

    // Check for duplicate names (excluding current area)
    const existingArea = await prisma.area.findFirst({
      where: {
        name: { equals: formattedName },
        id: { not: areaId },
      },
    });

    if (existingArea) {
      return NextResponse.json({ error: "An area with this name already exists" }, { status: 400 });
    }

    const updatedArea = await prisma.area.update({
      where: { id: areaId },
      data: { name: formattedName },
    });

    return NextResponse.json({
      success: true,
      message: "Area updated successfully",
      area: updatedArea,
    });
  } catch (error) {
    console.error("Error in PATCH /api/admin/areas/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/admin/areas/[id] - Delete an area (SUPER_ADMIN only)
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
        { error: "Forbidden: Only Super Admins can delete areas" },
        { status: 403 }
      );
    }

    const { id: areaId } = await params;

    // Safety check: verify if any routes use this area
    const referencingRoutesCount = await prisma.route.count({
      where: {
        OR: [{ fromAreaId: areaId }, { toAreaId: areaId }],
      },
    });

    if (referencingRoutesCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete area because it is referenced by ${referencingRoutesCount} route(s). Please delete those routes first.`,
        },
        { status: 400 }
      );
    }

    await prisma.area.delete({ where: { id: areaId } });

    return NextResponse.json({
      success: true,
      message: "Area deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/areas/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

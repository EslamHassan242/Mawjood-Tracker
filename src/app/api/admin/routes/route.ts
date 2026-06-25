import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView, canWrite } from "@/lib/permissions";

// GET /api/admin/routes - List all routes
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

    const routes = await prisma.route.findMany({
      include: {
        fromArea: true,
        toArea: true,
        _count: {
          select: {
            trips: {
              where: {
                status: "ACTIVE",
              },
            },
          },
        },
      },
      orderBy: [
        { fromArea: { name: "asc" } },
        { toArea: { name: "asc" } },
      ],
    });

    // Format count output nicely
    const formattedRoutes = routes.map((r) => ({
      id: r.id,
      fromAreaId: r.fromAreaId,
      toAreaId: r.toAreaId,
      fromArea: r.fromArea,
      toArea: r.toArea,
      price: r.price,
      isActive: r.isActive,
      createdAt: r.createdAt,
      tripsCount: r._count.trips,
    }));

    return NextResponse.json({ success: true, routes: formattedRoutes });
  } catch (error) {
    console.error("Error in GET /api/admin/routes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/admin/routes - Create a new route
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canWrite(role)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { fromAreaId, toAreaId, price } = body;

    if (!fromAreaId || !toAreaId || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const routePrice = parseFloat(price);
    if (isNaN(routePrice) || routePrice < 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }

    // Verify areas exist
    const fromArea = await prisma.area.findUnique({ where: { id: fromAreaId } });
    const toArea = await prisma.area.findUnique({ where: { id: toAreaId } });

    if (!fromArea || !toArea) {
      return NextResponse.json({ error: "One or both areas do not exist" }, { status: 404 });
    }

    // Check if this specific route fromArea -> toArea already exists
    const existingRoute = await prisma.route.findUnique({
      where: {
        fromAreaId_toAreaId: {
          fromAreaId,
          toAreaId,
        },
      },
    });

    if (existingRoute) {
      return NextResponse.json(
        { error: `A route from ${fromArea.name} to ${toArea.name} already exists. Please edit it instead.` },
        { status: 400 }
      );
    }

    const route = await prisma.route.create({
      data: {
        fromAreaId,
        toAreaId,
        price: routePrice,
        isActive: true,
      },
      include: {
        fromArea: true,
        toArea: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Route created successfully",
      route,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/routes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

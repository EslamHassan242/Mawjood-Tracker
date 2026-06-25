import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/areas - List all areas
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const areas = await prisma.area.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ success: true, areas });
  } catch (error) {
    console.error("Error in GET /api/admin/areas:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/admin/areas - Create a new area
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Area name is required" }, { status: 400 });
    }

    const formattedName = name.trim();

    // Check for duplicate names (case-insensitive)
    const existingArea = await prisma.area.findFirst({
      where: {
        name: {
          equals: formattedName,
        },
      },
    });

    if (existingArea) {
      return NextResponse.json({ error: "An area with this name already exists" }, { status: 400 });
    }

    const area = await prisma.area.create({
      data: {
        name: formattedName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Area created successfully",
      area,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/areas:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

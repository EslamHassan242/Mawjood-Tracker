import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { startOfDay, endOfDay } from "date-fns";

// GET /api/admin/captains - List captains with today's stats
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

    const captains = await prisma.user.findMany({
      where: {
        role: "CAPTAIN",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Aggregate today's stats for each captain
    const captainsWithStats = await Promise.all(
      captains.map(async (captain) => {
        const todayTrips = await prisma.tripRecord.findMany({
          where: {
            captainId: captain.id,
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

        const tripsCount = todayTrips.reduce((sum: number, trip) => sum + trip.ordersCount, 0);
        const revenue = todayTrips.reduce((sum: number, trip) => sum + (trip.unitPrice * trip.ordersCount), 0);

        return {
          ...captain,
          todayTrips: tripsCount,
          todayRevenue: revenue,
        };
      })
    );

    return NextResponse.json({ success: true, captains: captainsWithStats });
  } catch (error) {
    console.error("Error in GET /api/admin/captains:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/admin/captains - Create a new captain account
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
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create captain user
    const captain = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CAPTAIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Captain account created successfully",
      captain,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/captains:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

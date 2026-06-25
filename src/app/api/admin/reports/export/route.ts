import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const captainId = searchParams.get("captainId");
    const routeId = searchParams.get("routeId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build Prisma query filters dynamically
    const whereClause: any = {
      status: "ACTIVE", // Only active trips
    };

    if (captainId && captainId !== "all") {
      whereClause.captainId = captainId;
    }

    if (routeId && routeId !== "all") {
      whereClause.routeId = routeId;
    }

    if (startDateParam && endDateParam) {
      whereClause.createdAt = {
        gte: startOfDay(new Date(startDateParam)),
        lte: endOfDay(new Date(endDateParam)),
      };
    } else if (startDateParam) {
      whereClause.createdAt = {
        gte: startOfDay(new Date(startDateParam)),
      };
    } else if (endDateParam) {
      whereClause.createdAt = {
        lte: endOfDay(new Date(endDateParam)),
      };
    }

    // Query matching trips
    const trips = await prisma.tripRecord.findMany({
      where: whereClause,
      include: {
        captain: {
          select: {
            name: true,
            email: true,
          },
        },
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

    // Helper to escape CSV cell contents (RFC 4180)
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Construct CSV Header
    let csvContent = "Trip ID,Captain Name,From Area,To Area,Unit Price (EGP),Orders Count,Total Amount (EGP),Recorded At\n";

    // Append Rows
    trips.forEach((trip) => {
      const formattedDate = new Date(trip.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      csvContent += `${escapeCSV(trip.id)},`;
      csvContent += `${escapeCSV(trip.captain.name)},`;
      csvContent += `${escapeCSV(trip.route.fromArea.name)},`;
      csvContent += `${escapeCSV(trip.route.toArea.name)},`;
      csvContent += `${escapeCSV(trip.unitPrice)},`;
      csvContent += `${escapeCSV(trip.ordersCount)},`;
      csvContent += `${escapeCSV(trip.unitPrice * trip.ordersCount)},`;
      csvContent += `${escapeCSV(formattedDate)}\n`;
    });

    // Generate filename based on date
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `mawjood-report-${dateStr}.csv`;

    // Return as CSV attachment
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/reports/export:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { events } from "@/lib/events";
import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { canView } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Helper function to query the current dashboard metrics
async function getDashboardStats() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const monthStart = startOfMonth(new Date());

  // 1. Total Active Captains count
  const totalCaptains = await prisma.user.count({
    where: {
      role: "CAPTAIN",
      isActive: true,
    },
  });

  // 2. Today's Active Trips count (sum of ordersCount for ACTIVE trips)
  const todayTripsList = await prisma.tripRecord.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: "ACTIVE",
    },
    select: {
      ordersCount: true,
    },
  });
  const todayTrips = todayTripsList.reduce((sum, t) => sum + t.ordersCount, 0);

  // 3. Today's Revenue (sum of unitPrice * ordersCount for ACTIVE trips)
  const todayRevenueList = await prisma.tripRecord.findMany({
    where: {
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
  const todayRevenue = todayRevenueList.reduce((sum, t) => sum + (t.unitPrice * t.ordersCount), 0);

  // 4. Monthly Revenue (sum of unitPrice * ordersCount for ACTIVE trips this month)
  const monthRevenueList = await prisma.tripRecord.findMany({
    where: {
      createdAt: {
        gte: monthStart,
      },
      status: "ACTIVE",
    },
    select: {
      unitPrice: true,
      ordersCount: true,
    },
  });
  const monthRevenue = monthRevenueList.reduce((sum, t) => sum + (t.unitPrice * t.ordersCount), 0);

  return {
    totalCaptains,
    todayTrips,
    todayRevenue,
    monthRevenue,
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const role = (session.user as any).role as string;
    if (!canView(role)) {
      return new Response("Forbidden", { status: 403 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial stats immediately on connection
        try {
          const stats = await getDashboardStats();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
        } catch (err) {
          console.error("Error sending initial stats via SSE:", err);
        }

        // Listener for operational trip changes
        const onTripChange = async () => {
          try {
            const stats = await getDashboardStats();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
          } catch (err) {
            console.error("Error broadcasting updated stats via SSE:", err);
          }
        };

        // Subscribe to trip operations
        events.on("trip-change", onTripChange);

        // Send periodic heartbeat to keep the serverless/reverse-proxy connection open
        const keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch (err) {
            clearInterval(keepAliveInterval);
          }
        }, 15000);

        // Clean up connection listeners on client abort
        request.signal.addEventListener("abort", () => {
          events.off("trip-change", onTripChange);
          clearInterval(keepAliveInterval);
          try {
            controller.close();
          } catch (e) {
            // Stream might already be closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Bypasses buffering on proxies/Vercel
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/dashboard/realtime:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { trips, tripMembers, days } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/trips - List all trips
export async function GET() {
  try {
    const db = getDb();
    const allTrips = await db
      .select()
      .from(trips)
      .orderBy(desc(trips.createdAt));

    // Get member count for each trip
    const tripsWithCounts = await Promise.all(
      allTrips.map(async (trip) => {
        const members = await db
          .select()
          .from(tripMembers)
          .where(eq(tripMembers.tripId, trip.id));
        return { ...trip, memberCount: members.length };
      })
    );

    return NextResponse.json(tripsWithCounts);
  } catch (error) {
    console.error("GET /api/trips error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

// POST /api/trips - Create new trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, startDate, endDate, members } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Create trip
    const result = await db
      .insert(trips)
      .values({
        name,
        description: description || "",
        startDate,
        endDate,
        createdAt: new Date().toISOString(),
      })
      .returning();

    const tripId = result[0].id;

    // Color palette for members
    const memberColors = [
      "#FF6B35",
      "#06b6d4",
      "#a855f7",
      "#22c55e",
      "#f43f5e",
      "#eab308",
      "#3b82f6",
      "#ec4899",
    ];

    // Create members
    if (members && Array.isArray(members)) {
      for (let i = 0; i < members.length; i++) {
        if (members[i].trim()) {
          await db
            .insert(tripMembers)
            .values({
              tripId,
              name: members[i].trim(),
              color: memberColors[i % memberColors.length],
            });
        }
      }
    }

    // Auto-create days based on date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < diffDays; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + i);
      await db
        .insert(days)
        .values({
          tripId,
          dayNumber: i + 1,
          date: dayDate.toISOString().split("T")[0],
          title: "",
        });
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/trips error:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}

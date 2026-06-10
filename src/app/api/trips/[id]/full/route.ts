import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  trips,
  tripMembers,
  days,
  activities,
  expenses,
  expenseSplits,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// GET /api/trips/[id]/full - Get full trip data (flat structure for frontend)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const db = getDb();

    const tripResult = await db.select().from(trips).where(eq(trips.id, tripId));
    if (tripResult.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    const trip = tripResult[0];

    const members = await db
      .select()
      .from(tripMembers)
      .where(eq(tripMembers.tripId, tripId));

    const tripDays = await db
      .select()
      .from(days)
      .where(eq(days.tripId, tripId))
      .orderBy(asc(days.dayNumber));

    // Get ALL activities for this trip (flat array)
    const allActivities: Array<{
      id: number;
      dayId: number;
      sortOrder: number;
      time: string;
      title: string;
      description: string;
      category: string;
      lat: number | null;
      lng: number | null;
      locationName: string;
    }> = [];

    for (const day of tripDays) {
      const dayActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.dayId, day.id))
        .orderBy(asc(activities.sortOrder));
        
      for (const act of dayActivities) {
        allActivities.push({
          id: act.id,
          dayId: act.dayId,
          sortOrder: act.sortOrder,
          time: act.time || "",
          title: act.title,
          description: act.description || "",
          category: act.category,
          lat: act.lat,
          lng: act.lng,
          locationName: act.locationName || "",
        });
      }
    }

    // Get expenses with splits
    const tripExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, tripId));

    const expensesWithSplits = await Promise.all(
      tripExpenses.map(async (expense) => {
        const splits = await db
          .select()
          .from(expenseSplits)
          .where(eq(expenseSplits.expenseId, expense.id));
        return { ...expense, splits };
      })
    );

    return NextResponse.json({
      ...trip,
      members,
      days: tripDays,
      activities: allActivities,
      expenses: expensesWithSplits,
    });
  } catch (error) {
    console.error("GET /api/trips/[id]/full error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

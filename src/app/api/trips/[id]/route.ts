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

// GET /api/trips/[id] - Get full trip data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const db = getDb();

    const tripResult = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId));
      
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

    // Get activities for each day
    const daysWithActivities = await Promise.all(
      tripDays.map(async (day) => {
        const dayActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.dayId, day.id))
          .orderBy(asc(activities.sortOrder));
        return { ...day, activities: dayActivities };
      })
    );

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
      days: daysWithActivities,
      expenses: expensesWithSplits,
    });
  } catch (error) {
    console.error("GET /api/trips/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

// PUT /api/trips/[id] - Update trip
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const body = await request.json();
    const db = getDb();

    const result = await db
      .update(trips)
      .set({
        name: body.name,
        description: body.description,
      })
      .where(eq(trips.id, tripId))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("PUT /api/trips/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[id] - Delete trip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const db = getDb();

    await db.delete(trips).where(eq(trips.id, tripId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/trips/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}

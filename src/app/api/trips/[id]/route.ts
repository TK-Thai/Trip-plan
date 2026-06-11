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
import { eq, asc, inArray } from "drizzle-orm";
import { censorText } from "@/lib/censor";

// GET /api/trips/[id] - Get full trip data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const db = getDb();

    const [tripResult, members, tripDays, tripExpenses, allActivities, allSplits] = await Promise.all([
      db.select().from(trips).where(eq(trips.id, tripId)),
      db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)),
      db.select().from(days).where(eq(days.tripId, tripId)).orderBy(asc(days.dayNumber)),
      db.select().from(expenses).where(eq(expenses.tripId, tripId)),
      db.select({
        id: activities.id,
        dayId: activities.dayId,
        sortOrder: activities.sortOrder,
        time: activities.time,
        title: activities.title,
        description: activities.description,
        category: activities.category,
        lat: activities.lat,
        lng: activities.lng,
        locationName: activities.locationName,
      })
      .from(activities)
      .innerJoin(days, eq(activities.dayId, days.id))
      .where(eq(days.tripId, tripId))
      .orderBy(asc(activities.sortOrder)),
      db.select({
        id: expenseSplits.id,
        expenseId: expenseSplits.expenseId,
        memberId: expenseSplits.memberId,
        shareAmount: expenseSplits.shareAmount,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(eq(expenses.tripId, tripId))
    ]);

    if (tripResult.length === 0) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    const trip = tripResult[0];

    const daysWithActivities = tripDays.map((day) => ({
      ...day,
      activities: allActivities.filter(a => a.dayId === day.id)
    }));

    const expensesWithSplits = tripExpenses.map((expense) => ({
      ...expense,
      splits: allSplits.filter(s => s.expenseId === expense.id)
    }));

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
        name: body.name ? censorText(body.name) : body.name,
        description: body.description ? censorText(body.description) : body.description,
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

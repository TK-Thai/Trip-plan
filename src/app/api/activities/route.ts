import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// POST /api/activities - Create activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dayId, time, title, description, category, lat, lng, locationName, sortOrder } = body;

    if (!dayId || !title) {
      return NextResponse.json(
        { error: "Missing required fields (dayId, title)" },
        { status: 400 }
      );
    }

    const db = getDb();

    // If no sortOrder given, put at end
    let order = sortOrder;
    if (order === undefined || order === null) {
      const existing = await db
        .select()
        .from(activities)
        .where(eq(activities.dayId, dayId))
        .orderBy(asc(activities.sortOrder));
      order = existing.length > 0 ? existing[existing.length - 1].sortOrder + 1 : 0;
    }

    const result = await db
      .insert(activities)
      .values({
        dayId,
        sortOrder: order,
        time: time || "",
        title,
        description: description || "",
        category: category || "activity",
        lat: lat || null,
        lng: lng || null,
        locationName: locationName || "",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/activities error:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

// PUT /api/activities - Update activity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, time, title, description, category, lat, lng, locationName, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing activity id" },
        { status: 400 }
      );
    }

    const db = getDb();

    const updateData: Record<string, unknown> = {};
    if (time !== undefined) updateData.time = time;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (locationName !== undefined) updateData.locationName = locationName;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const result = await db
      .update(activities)
      .set(updateData)
      .where(eq(activities.id, id))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("PUT /api/activities error:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities - Delete activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing activity id" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.delete(activities).where(eq(activities.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/activities error:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}

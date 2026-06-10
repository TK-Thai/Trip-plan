import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tripMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/members - Add member to trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, name, color } = body;

    if (!tripId || !name) {
      return NextResponse.json(
        { error: "Missing required fields (tripId, name)" },
        { status: 400 }
      );
    }

    const db = getDb();

    const result = await db
      .insert(tripMembers)
      .values({
        tripId,
        name: name.trim(),
        color: color || "#FF6B35",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/members error:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

// DELETE /api/members - Remove member
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing member id" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.delete(tripMembers).where(eq(tripMembers.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/members error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}

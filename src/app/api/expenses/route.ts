import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { expenses, expenseSplits } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/expenses - Create expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tripId,
      dayId,
      description,
      amount,
      category,
      paidById,
      splitWith,
      splitType,
    } = body;

    if (!tripId || !description || !amount || !paidById) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Create expense
    const expenseResult = await db
      .insert(expenses)
      .values({
        tripId,
        dayId: dayId || null,
        description,
        amount,
        category: category || "other",
        paidById,
        createdAt: new Date().toISOString(),
      })
      .returning();
      
    const expense = expenseResult[0];

    // Create splits
    if (splitWith && Array.isArray(splitWith) && splitWith.length > 0) {
      if (splitType === "custom" && body.customAmounts) {
        // Custom split amounts
        for (const memberId of splitWith) {
          const shareAmount = body.customAmounts[memberId] || 0;
          await db.insert(expenseSplits)
            .values({
              expenseId: expense.id,
              memberId,
              shareAmount,
            });
        }
      } else {
        // Equal split (default)
        const shareAmount =
          Math.round((amount / splitWith.length) * 100) / 100;
        for (const memberId of splitWith) {
          await db.insert(expenseSplits)
            .values({
              expenseId: expense.id,
              memberId,
              shareAmount,
            });
        }
      }
    }

    // Return expense with splits
    const splits = await db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.expenseId, expense.id));

    return NextResponse.json({ ...expense, splits }, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}

// PUT /api/expenses - Update expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, description, amount, category, paidById, dayId, splitWith, splitType } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing expense id" },
        { status: 400 }
      );
    }

    const db = getDb();

    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (paidById !== undefined) updateData.paidById = paidById;
    if (dayId !== undefined) updateData.dayId = dayId;

    const result = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();
      
    const updatedExpense = result[0];

    // If splits are being updated
    if (splitWith && Array.isArray(splitWith)) {
      // Delete old splits
      await db.delete(expenseSplits)
        .where(eq(expenseSplits.expenseId, id));

      const expenseAmount = amount || updatedExpense.amount;

      if (splitType === "custom" && body.customAmounts) {
        for (const memberId of splitWith) {
          const shareAmount = body.customAmounts[memberId] || 0;
          await db.insert(expenseSplits)
            .values({
              expenseId: id,
              memberId,
              shareAmount,
            });
        }
      } else {
        const shareAmount =
          Math.round((expenseAmount / splitWith.length) * 100) / 100;
        for (const memberId of splitWith) {
          await db.insert(expenseSplits)
            .values({
              expenseId: id,
              memberId,
              shareAmount,
            });
        }
      }
    }

    const splits = await db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.expenseId, id));

    return NextResponse.json({ ...updatedExpense, splits });
  } catch (error) {
    console.error("PUT /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing expense id" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.delete(expenses).where(eq(expenses.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}

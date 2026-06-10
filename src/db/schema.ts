import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ===== TRIPS =====
export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").default(""),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  shareId: text("share_id"), // for future share link feature
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ===== TRIP MEMBERS =====
export const tripMembers = sqliteTable("trip_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#FF6B35"),
});

// ===== DAYS =====
export const days = sqliteTable("days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  date: text("date").notNull(),
  title: text("title").default(""),
});

// ===== ACTIVITIES =====
export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  time: text("time").default(""),
  title: text("title").notNull(),
  description: text("description").default(""),
  category: text("category").notNull().default("activity"),
  lat: real("lat"),
  lng: real("lng"),
  locationName: text("location_name").default(""),
});

// ===== EXPENSES =====
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  dayId: integer("day_id").references(() => days.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull().default("other"),
  paidById: integer("paid_by_id")
    .notNull()
    .references(() => tripMembers.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ===== EXPENSE SPLITS =====
export const expenseSplits = sqliteTable("expense_splits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expenseId: integer("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  memberId: integer("member_id")
    .notNull()
    .references(() => tripMembers.id, { onDelete: "cascade" }),
  shareAmount: real("share_amount").notNull(),
});

// ===== Types =====
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripMember = typeof tripMembers.$inferSelect;
export type Day = typeof days.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;

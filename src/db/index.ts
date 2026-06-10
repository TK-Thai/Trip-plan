import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import path from "path";

// For local development, it will create a trip-planner.db file
// For production on Vercel, it will use TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), "trip-planner.db")}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const client = createClient({
      url,
      authToken,
    });

    // Auto-create tables (executed synchronously/asynchronously by LibSQL)
    client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        share_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS trip_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#FF6B35'
      );

      CREATE TABLE IF NOT EXISTS days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        date TEXT NOT NULL,
        title TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        time TEXT DEFAULT '',
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'activity',
        lat REAL,
        lng REAL,
        location_name TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        day_id INTEGER REFERENCES days(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        paid_by_id INTEGER NOT NULL REFERENCES trip_members(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS expense_splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES trip_members(id) ON DELETE CASCADE,
        share_amount REAL NOT NULL
      );
    `).catch(console.error);

    _db = drizzle(client, { schema });
  }
  return _db;
}

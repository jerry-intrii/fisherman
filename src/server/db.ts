import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as {
	__pokerDb?: Database.Database;
};

function createDatabase() {
	const dbFolder = path.join(process.cwd(), "data");
	const dbPath = path.join(dbFolder, "poker-tracker.db");

	fs.mkdirSync(dbFolder, { recursive: true });

	const database = new Database(dbPath);
	database.pragma("journal_mode = WAL");

	database.exec(`
    CREATE TABLE IF NOT EXISTS tournament_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      buy_in REAL NOT NULL,
      cash_out REAL NOT NULL,
      notes TEXT,
      event_time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_entries_user_time
      ON tournament_entries (user_id, event_time);
    CREATE TABLE IF NOT EXISTS user_tournament_names (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );
  `);

	return database;
}

if (!globalForDb.__pokerDb) {
	globalForDb.__pokerDb = createDatabase();
}

export const db = globalForDb.__pokerDb;

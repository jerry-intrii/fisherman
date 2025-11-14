import { db } from "./db";

export type TournamentEntry = {
	id: number;
	userId: string;
	name: string;
	buyIn: number;
	cashOut: number;
	notes: string | null;
	eventTime: string;
	createdAt: string;
};

export type TournamentInput = {
	name: string;
	buyIn: number;
	cashOut: number;
	notes?: string;
	eventTime: string;
};

export type ChartPoint = {
	at: string;
	cumulative: number;
};

export type Summary = {
	totalEvents: number;
	netProfit: number;
	avgProfit: number;
	roi: number;
};

export const publicTournamentLocations = [
	"CTP 台中崇德",
	"CTP 七期市政",
	"6BET TPE",
];

const selectEntriesStmt = db.prepare<[{ userId: string }], TournamentEntry>(`
  SELECT
    id,
    user_id as userId,
    name,
    buy_in as buyIn,
    cash_out as cashOut,
    notes,
    event_time as eventTime,
    created_at as createdAt
  FROM tournament_entries
  WHERE user_id = @userId
  ORDER BY datetime(event_time) DESC
`);

const selectEventsForChartStmt = db.prepare<
	[{ userId: string }],
	{ eventTime: string; buyIn: number; cashOut: number }
>(`
  SELECT event_time as eventTime, buy_in as buyIn, cash_out as cashOut
  FROM tournament_entries
  WHERE user_id = @userId
  ORDER BY datetime(event_time) ASC
`);

const insertEntryStmt = db.prepare(`
  INSERT INTO tournament_entries (user_id, name, buy_in, cash_out, notes, event_time)
  VALUES (@userId, @name, @buyIn, @cashOut, @notes, @eventTime)
`);

const insertUserTournamentNameStmt = db.prepare(`
  INSERT OR IGNORE INTO user_tournament_names (user_id, name)
  VALUES (@userId, @name)
`);

const searchUserTournamentNamesStmt = db.prepare<
	[{ userId: string; pattern: string }],
	{ name: string }
>(
	`
  SELECT name
  FROM user_tournament_names
  WHERE user_id = @userId AND name LIKE @pattern COLLATE NOCASE
  ORDER BY name COLLATE NOCASE ASC
  LIMIT 8
`,
);

const selectSummaryStmt = db.prepare<[{ userId: string }], Summary>(`
  SELECT
    COUNT(*) as totalEvents,
    IFNULL(SUM(cash_out - buy_in), 0) as netProfit,
    CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(cash_out - buy_in) / COUNT(*) END as avgProfit,
    CASE WHEN SUM(buy_in) = 0 THEN 0 ELSE (SUM(cash_out - buy_in) * 1.0) / SUM(buy_in) END as roi
  FROM tournament_entries
  WHERE user_id = @userId
`);

const getEntryByIdStmt = db.prepare<[number], TournamentEntry>(`
  SELECT
    id,
    user_id as userId,
    name,
    buy_in as buyIn,
    cash_out as cashOut,
    notes,
    event_time as eventTime,
    created_at as createdAt
  FROM tournament_entries
  WHERE id = ?
`);

const deleteEntryStmt = db.prepare(`
  DELETE FROM tournament_entries WHERE id = @id AND user_id = @userId
`);

export function listEntries(userId: string) {
	return selectEntriesStmt.all({ userId });
}

export function createEntry(userId: string, input: TournamentInput) {
	const row = insertEntryStmt.run({
		userId,
		name: input.name,
		buyIn: input.buyIn,
		cashOut: input.cashOut,
		notes: input.notes ?? null,
		eventTime: input.eventTime,
	});

	const created = getEntryByIdStmt.get(Number(row.lastInsertRowid));
	if (!created) {
		throw new Error("Unable to create tournament entry");
	}

	return created;
}

export function updateEntry(
	userId: string,
	entryId: number,
	input: TournamentInput,
) {
	const stmt = db.prepare(`
		UPDATE tournament_entries
		SET name = @name,
			buy_in = @buyIn,
			cash_out = @cashOut,
			notes = @notes,
			event_time = @eventTime
		WHERE id = @id AND user_id = @userId
	`);
	const changes = stmt.run({
		id: entryId,
		userId,
		name: input.name,
		buyIn: input.buyIn,
		cashOut: input.cashOut,
		notes: input.notes ?? null,
		eventTime: input.eventTime,
	}).changes;
	if (!changes) {
		throw new Error("Unable to update tournament entry");
	}
	const updated = getEntryByIdStmt.get(entryId);
	if (!updated) {
		throw new Error("Updated entry not found");
	}
	return updated;
}

export function saveUserTournamentName(userId: string, rawName: string) {
	const trimmed = rawName.trim();
	if (!trimmed) return;
	insertUserTournamentNameStmt.run({ userId, name: trimmed });
}

export function searchTournamentNames(userId: string, query: string) {
	const normalized = query.trim().toLowerCase();
	const pattern = normalized.length ? `%${normalized}%` : "%";
	const userNames = searchUserTournamentNamesStmt
		.all({ userId, pattern })
		.map((row) => row.name);

	const seen = new Set<string>();
	const push = (value: string) => {
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) return;
		seen.add(trimmed);
	};

	publicTournamentLocations.forEach((location) => {
		if (!normalized || location.toLowerCase().includes(normalized)) {
			push(location);
		}
	});

	userNames.forEach(push);

	return Array.from(seen);
}

export function deleteEntry(userId: string, entryId: number) {
	const result = deleteEntryStmt.run({ userId, id: entryId });
	return result.changes > 0;
}

export function getChart(userId: string): ChartPoint[] {
	const rows = selectEventsForChartStmt.all({ userId });

	let cumulative = 0;
	return rows.map((row) => {
		cumulative += row.cashOut - row.buyIn;
		return {
			at: row.eventTime,
			cumulative,
		};
	});
}

export function getSummary(userId: string): Summary {
	const summary = selectSummaryStmt.get({ userId });
	if (!summary) {
		return {
			totalEvents: 0,
			netProfit: 0,
			avgProfit: 0,
			roi: 0,
		};
	}

	return {
		totalEvents: summary.totalEvents ?? 0,
		netProfit: summary.netProfit ?? 0,
		avgProfit: summary.avgProfit ?? 0,
		roi: summary.roi ?? 0,
	};
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { auth } from "@/lib/auth";

import {
	createEntry,
	deleteEntry,
	getChart,
	getSummary,
	listEntries,
	saveUserTournamentName,
	searchTournamentNames,
	type TournamentInput,
	updateEntry,
} from "./poker-store";

const entryInputSchema = z.object({
	name: z.string().min(1, "請輸入比賽名稱"),
	buyIn: z.number().min(0),
	cashOut: z.number().min(0),
	notes: z.string().max(500).optional(),
	eventTime: z.string(),
});

type ServerCtx = {
	request?: Request;
	data?: unknown;
};

async function requireUser(ctx: ServerCtx) {
	const request = ctx.request;
	if (!request) {
		throw new Error("Missing request context");
	}

	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return session.user;
}

export const getDashboardData = createServerFn({
	method: "GET",
}).handler(async (ctx: ServerCtx) => {
	const user = await requireUser(ctx);

	const entries = listEntries(user.id);

	return {
		entries,
		chart: getChart(user.id),
		summary: getSummary(user.id),
	};
});

export const createTournamentEntry = createServerFn({
	method: "POST",
})
	.inputValidator(entryInputSchema)
	.handler(async (ctx: ServerCtx & { data: TournamentInput }) => {
		const user = await requireUser(ctx);

		const entry = createEntry(user.id, ctx.data);
		saveUserTournamentName(user.id, ctx.data.name);
		return {
			entry,
			chart: getChart(user.id),
			summary: getSummary(user.id),
		};
	});

const suggestionInput = z.object({
	query: z.string().optional(),
});

export const getTournamentNameSuggestions = createServerFn({
	method: "POST",
})
	.inputValidator(suggestionInput)
	.handler(async (ctx: ServerCtx & { data: { query?: string } }) => {
		const user = await requireUser(ctx);
		const query = ctx.data?.query ?? "";
		return searchTournamentNames(user.id, query);
	});

const deleteInput = z.object({
	entryId: z.number().min(1),
});

export const deleteTournamentEntry = createServerFn({
	method: "POST",
})
	.inputValidator(deleteInput)
	.handler(async (ctx: ServerCtx & { data: { entryId: number } }) => {
		const user = await requireUser(ctx);
		const success = deleteEntry(user.id, ctx.data.entryId);
		if (!success) {
			throw new Response("Not Found", { status: 404 });
		}
		return {
			entries: listEntries(user.id),
			chart: getChart(user.id),
			summary: getSummary(user.id),
		};
	});

const updateInput = entryInputSchema.extend({
	entryId: z.number().min(1),
});

export const updateTournamentEntry = createServerFn({
	method: "POST",
})
	.inputValidator(updateInput)
	.handler(
		async (
			ctx: ServerCtx & { data: TournamentInput & { entryId: number } },
		) => {
			const user = await requireUser(ctx);
			const entry = updateEntry(user.id, ctx.data.entryId, ctx.data);
			saveUserTournamentName(user.id, ctx.data.name);
			return {
				entry,
				entries: listEntries(user.id),
				chart: getChart(user.id),
				summary: getSummary(user.id),
			};
		},
	);

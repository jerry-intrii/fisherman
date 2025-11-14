import { betterAuth } from "better-auth";
import { reactStartCookies } from "better-auth/react-start";

import { env } from "@/env";
import { db } from "@/server/db";

const googleClientId =
	env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret =
	env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";

if (!googleClientId || !googleClientSecret) {
	throw new Error(
		"Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.",
	);
}

const baseURL =
	env.SERVER_URL ??
	process.env.SERVER_URL ??
	`http://localhost:${process.env.PORT ?? 3000}`;

export const auth = betterAuth({
	appName: "Fisher Man",
	baseURL,
	database: db,
	socialProviders: {
		google: {
			clientId: googleClientId,
			clientSecret: googleClientSecret,
			prompt: "select_account",
		},
	},
	plugins: [reactStartCookies()],
});

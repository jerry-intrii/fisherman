# syntax=docker/dockerfile:1.7

FROM node:22-bookworm AS base
WORKDIR /app
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/* \
	&& corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm build

FROM deps AS prod-deps
RUN pnpm prune --prod

FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV POKER_DB_DIR=/data
# Use non-root user for runtime
RUN useradd -r -u 1001 -g root worker \
	&& mkdir -p /app /data \
	&& chown -R worker:root /app /data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/.output ./.output

USER worker
VOLUME ["/data"]
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/database/package.json packages/database/
COPY packages/services/package.json packages/services/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/services/node_modules ./packages/services/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY tsconfig.base.json ./
COPY packages/database packages/database
COPY packages/shared packages/shared
COPY packages/services packages/services
COPY apps/dashboard apps/dashboard

# Generate Prisma client
RUN pnpm --filter @atlas/database generate

# Build all packages in dependency order
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm --filter @atlas/shared build
RUN pnpm --filter @atlas/database build
RUN pnpm --filter @atlas/services build
RUN pnpm --filter @atlas/dashboard build

# ── Production image ──────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy node_modules (full pnpm workspace with symlinks)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/services/node_modules ./packages/services/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy workspace configs
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/pnpm-lock.yaml ./

# Copy built packages
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/package.json ./packages/database/
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/services/dist ./packages/services/dist
COPY --from=build /app/packages/services/package.json ./packages/services/

# Copy built Next.js app
COPY --from=build /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=build /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=build /app/apps/dashboard/package.json ./apps/dashboard/
COPY --from=build /app/apps/dashboard/next.config.js ./apps/dashboard/

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["pnpm", "--filter", "@atlas/dashboard", "start"]

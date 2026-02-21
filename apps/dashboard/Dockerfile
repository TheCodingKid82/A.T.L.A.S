FROM node:20-slim AS base
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
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build /app/apps/dashboard/public ./apps/dashboard/public

# Create symlinks from pnpm store so Node.js can resolve packages
RUN for dir in node_modules/.pnpm/*/node_modules/*/; do \
      pkg=$(echo "$dir" | sed "s|node_modules/.pnpm/[^/]*/node_modules/||;s|/$||"); \
      if [ ! -e "node_modules/$pkg" ]; then \
        mkdir -p "node_modules/$(dirname "$pkg")"; \
        ln -s "$(pwd)/$dir" "node_modules/$pkg"; \
      fi; \
    done 2>/dev/null || true

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]

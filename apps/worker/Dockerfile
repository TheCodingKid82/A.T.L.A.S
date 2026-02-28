FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl curl git python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/database/package.json packages/database/
COPY packages/services/package.json packages/services/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/services/node_modules ./packages/services/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY tsconfig.base.json ./
COPY packages/database packages/database
COPY packages/shared packages/shared
COPY packages/services packages/services
COPY apps/worker apps/worker

# Generate Prisma client
RUN pnpm --filter @atlas/database generate

# Build all packages in dependency order
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm --filter @atlas/shared build
RUN pnpm --filter @atlas/database build
RUN pnpm --filter @atlas/services build
RUN pnpm --filter @atlas/worker build

# ── Production image ──────────────────────────────────────────
FROM base AS runner

# Install Claude Code CLI, Railway CLI, GitHub CLI, gosu, and display stack
RUN npm install -g @anthropic-ai/claude-code@latest @railway/cli && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh gosu \
    # Display stack for computer-use mode
    xvfb openbox xterm \
    # Automation tools
    xdotool scrot imagemagick \
    # VNC server
    x11vnc \
    # Fonts for terminal rendering
    xfonts-base fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install noVNC + websockify for browser-based VNC access
RUN git clone --branch v1.5.0 --depth 1 https://github.com/novnc/noVNC.git /opt/noVNC && \
    git clone --branch v0.12.0 --depth 1 https://github.com/novnc/websockify.git /opt/noVNC/utils/websockify && \
    rm -rf /opt/noVNC/.git /opt/noVNC/utils/websockify/.git

# Display environment
ENV DISPLAY=:1
ENV DISPLAY_WIDTH=1024
ENV DISPLAY_HEIGHT=768
ENV VNC_PORT=5901
ENV NOVNC_PORT=6080

# Create non-root user — Claude Code CLI blocks bypassPermissions as root
RUN useradd -m -s /bin/bash worker

COPY --from=build /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/services/node_modules ./packages/services/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/package.json ./packages/database/
COPY --from=build /app/packages/database/prisma ./packages/database/prisma

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/

COPY --from=build /app/packages/services/dist ./packages/services/dist
COPY --from=build /app/packages/services/package.json ./packages/services/

COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/

COPY package.json pnpm-workspace.yaml ./
COPY apps/worker/entrypoint.sh ./apps/worker/entrypoint.sh
COPY apps/worker/scripts ./apps/worker/scripts
RUN chmod +x ./apps/worker/entrypoint.sh ./apps/worker/scripts/*.sh

ENV NODE_ENV=production

CMD ["./apps/worker/entrypoint.sh"]

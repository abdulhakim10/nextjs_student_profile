# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars must be present at build time (baked into client bundle).
# Pass them via --build-arg or .env file.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_UTILITIES_API_BASE_URL
ARG NEXT_PUBLIC_AUTH_API_BASE_URL
ARG NEXT_PUBLIC_ATTENDANCE_API_BASE_URL
ARG NEXT_PUBLIC_NOTIFICATION_API_BASE_URL
ARG NEXT_PUBLIC_API_VERSION
ARG NEXT_PUBLIC_DEFAULT_APP
ARG NEXT_PUBLIC_DEFAULT_USER_TYPE
ARG NEXT_PUBLIC_APP_NAME

RUN npm run build

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=40001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 40001

CMD ["node", "server.js"]

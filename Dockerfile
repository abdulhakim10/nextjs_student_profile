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

# NEXT_PUBLIC_* values come from GitLab CI variables via `--build-arg`.
# `ARG` declares each; `ENV` forwards it into the shell env so `next build`
# can pick it up and bake it into the client JS bundle. Both lines are
# required — `ARG` alone is not visible to the `next build` process.
#
# This is the baseline template. When forking for a new module, add ARG +
# matching ENV lines below (and matching --build-arg lines in .gitlab-ci.yml)
# for any module-specific NEXT_PUBLIC_* the new code uses — e.g.
#   ARG NEXT_PUBLIC_ATTENDANCE_API_BASE_URL
#   ENV NEXT_PUBLIC_ATTENDANCE_API_BASE_URL=$NEXT_PUBLIC_ATTENDANCE_API_BASE_URL
ARG NEXT_PUBLIC_AUTH_API_BASE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_UTILITIES_API_BASE_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_API_VERSION
ARG NEXT_PUBLIC_DEFAULT_APP
ARG NEXT_PUBLIC_DEFAULT_USER_TYPE
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_APP_VERSION_DATE
ARG NEXT_PUBLIC_INTERNAL_APPCODE

ENV NEXT_PUBLIC_AUTH_API_BASE_URL=$NEXT_PUBLIC_AUTH_API_BASE_URL \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_UTILITIES_API_BASE_URL=$NEXT_PUBLIC_UTILITIES_API_BASE_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_API_VERSION=$NEXT_PUBLIC_API_VERSION \
    NEXT_PUBLIC_DEFAULT_APP=$NEXT_PUBLIC_DEFAULT_APP \
    NEXT_PUBLIC_DEFAULT_USER_TYPE=$NEXT_PUBLIC_DEFAULT_USER_TYPE \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NEXT_PUBLIC_APP_VERSION_DATE=$NEXT_PUBLIC_APP_VERSION_DATE \
    NEXT_PUBLIC_INTERNAL_APPCODE=$NEXT_PUBLIC_INTERNAL_APPCODE

RUN npm run build

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]

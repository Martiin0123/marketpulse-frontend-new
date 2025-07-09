# Use the official Node.js image as base
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Debug environment variables before build
RUN echo "=== Build Environment Debug ===" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "NEXT_TELEMETRY_DISABLED: $NEXT_TELEMETRY_DISABLED" && \
    echo "=== End Environment Debug ==="

# Build the application with verbose output
RUN npm run build

# Debug: Show what was built
RUN echo "=== Build Output Debug ===" && \
    ls -la .next/ && \
    echo "=== Standalone check ===" && \
    ls -la .next/standalone/ && \
    echo "=== Server.js check ===" && \
    test -f .next/standalone/server.js && echo "server.js exists" || echo "server.js missing" && \
    echo "=== Static check ===" && \
    ls -la .next/static/ && \
    echo "=== Debug complete ==="

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Debug: Verify files were copied correctly in production
RUN echo "=== Production Debug ===" && \
    ls -la ./ && \
    echo "=== .next dir ===" && \
    ls -la .next/ && \
    echo "=== server.js check ===" && \
    test -f server.js && echo "server.js found" || echo "server.js missing" && \
    echo "=== Production debug complete ==="

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

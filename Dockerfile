# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine compatibility
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install SQLite for backup commands, su-exec for user switching, and OpenSSL for Prisma
RUN apk add --no-cache sqlite su-exec openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for migrations (run at container startup via CMD)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Ensure nextjs user can write to Prisma engines directory
RUN chown -R nextjs:nodejs /app/node_modules/@prisma /app/node_modules/.prisma

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Entrypoint: ensure dirs exist on mounted volume, fix ownership, run migrations, start server
# Note: release_command cannot be used because Fly does not mount volumes for release commands
CMD ["sh", "-c", "mkdir -p /data/backups /data/uploads && chown -R nextjs:nodejs /data && su-exec nextjs node ./node_modules/prisma/build/index.js migrate deploy && exec su-exec nextjs node server.js"]

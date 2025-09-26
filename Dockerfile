# Multi-stage build for Fusion Starter (Vite + Express)

FROM node:20-alpine AS builder

ENV NODE_ENV=development
WORKDIR /app

# Enable corepack and pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# esbuild/vite em Alpine: garantir compatibilidade glibc
RUN apk add --no-cache libc6-compat

# Install deps first (better caching)
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy source and build
COPY . .
RUN pnpm build

# Reduce to production deps only
RUN pnpm prune --prod


FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app

# Copy production node_modules and built assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server/node-build.mjs"]



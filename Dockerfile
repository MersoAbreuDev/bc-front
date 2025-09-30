# Build stage
FROM node:20-slim AS builder

WORKDIR /app
ENV NODE_ENV=development
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .
RUN pnpm build
RUN pnpm prune --prod

# Production stage
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/server/node-build.mjs"]

FROM node:20-slim AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .
RUN pnpm build

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8080
CMD ["node", "server/node-build.js"]

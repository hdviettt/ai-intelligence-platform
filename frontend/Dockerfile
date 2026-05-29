# Build + run the frontend entirely on bun, using the official oven/bun image.
# This avoids Railpack/mise downloading bun at build time (its download is flaky
# on Railway's builder and was failing deploys). Bun is baked into the image.

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1 AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
# package.json "start" binds 0.0.0.0 and honours $PORT (Railway sets it).
CMD ["bun", "run", "start"]

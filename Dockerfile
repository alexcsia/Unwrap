
FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate

RUN bun run build



FROM oven/bun:1 AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 8080

# Default: API
CMD ["bun", "dist/app.js"]

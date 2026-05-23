# ----- Build stage -----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm pkg delete scripts.prepare && npm ci --workspace=apps/backend

COPY apps/backend ./apps/backend
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma
RUN npm run build --workspace=apps/backend

# ----- Production stage -----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

EXPOSE 4000
CMD ["node", "apps/backend/dist/src/main.js"]

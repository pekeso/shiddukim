# ----- Build stage -----
FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://172.105.156.186:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm pkg delete scripts.prepare && npm ci --workspace=apps/frontend

COPY apps/frontend ./apps/frontend
RUN npm run build --workspace=apps/frontend

# ----- Production stage -----
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]

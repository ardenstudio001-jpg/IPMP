FROM node:22-alpine AS builder 
ENV PNPM_HOME=/pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app 

COPY package*.json pnpm-lock.yaml ./


COPY prisma ./prisma/ 

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . . 

RUN npx prisma generate 

RUN pnpm run build 

FROM node:22-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --omit=dev

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]

FROM node:20-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3000 5555
# prisma generate : régénère le client au démarrage pour refléter les changements de schéma (ex: passwordHash optionnel pour OAuth)
# --accept-data-loss : permet d'appliquer les migrations destructives en dev sans bloquer le démarrage
CMD npx prisma generate && npx prisma db push --skip-generate --accept-data-loss && npx prisma studio --port 5555 --hostname 0.0.0.0 & npm run dev

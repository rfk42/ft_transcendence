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
# Au démarrage : sync les dépendances, génère Prisma, pousse le schéma, puis lance le serveur.
# Prisma Studio n'est lancé que si ENABLE_PRISMA_STUDIO=true.
CMD sh -c "npm ci --prefer-offline && npx prisma generate && npx prisma db push --skip-generate --accept-data-loss && if [ \"${ENABLE_PRISMA_STUDIO:-false}\" = \"true\" ]; then npx prisma studio --port 5555 --hostname 0.0.0.0 & fi && npm run dev"

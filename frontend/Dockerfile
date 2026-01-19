# frontend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# deps
FROM base AS deps
COPY package*.json ./
RUN npm ci

# dev
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
# Important: --host 0.0.0.0 pour être accessible depuis nginx/docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

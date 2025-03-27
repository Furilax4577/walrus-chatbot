# Étape 1 : Build du projet
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Étape 2 : Exécution
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copie des données (RAG)
COPY --from=builder /app/data ./data

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/main"]

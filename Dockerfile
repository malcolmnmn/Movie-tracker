# Baut das React-Frontend und stellt es zusammen mit der Express-API in einem
# einzigen Image bereit. Funktioniert auf jedem Docker-fähigen Hoster
# (Render, Railway, Fly.io, Google Cloud Run, eigener Server, ...).

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]

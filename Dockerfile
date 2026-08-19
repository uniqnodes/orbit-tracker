FROM node:26-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 orbit && adduser --system --uid 1001 orbit
COPY --from=builder --chown=orbit:orbit /app/.next/standalone ./
COPY --from=builder --chown=orbit:orbit /app/.next/static ./.next/static
# The same immutable migration files can be run as a one-off container command
# before starting the web server: node db/migrate.mjs.
COPY --from=builder --chown=orbit:orbit /app/db ./db
USER orbit
EXPOSE 3000
CMD ["node", "server.js"]

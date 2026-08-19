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
USER orbit
EXPOSE 3000
CMD ["node", "server.js"]

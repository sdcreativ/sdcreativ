# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SITE_URL=https://sdcreativ.com
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_BOOKING_URL=
ARG NEXT_PUBLIC_BOOKING_EMBED_URL=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ARG NEXT_PUBLIC_THREE_CX_ENABLED=false
ARG NEXT_PUBLIC_THREE_CX_PBX_FQDN=
ARG NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK=
ARG NEXT_PUBLIC_THREE_CX_IGNORE_HOURS=false
ARG NEXT_PUBLIC_THREE_CX_WEB_CLIENT_URL=
ARG NEXT_PUBLIC_CRM_MESSAGERIE_ENABLED=1
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_BOOKING_URL=$NEXT_PUBLIC_BOOKING_URL
ENV NEXT_PUBLIC_BOOKING_EMBED_URL=$NEXT_PUBLIC_BOOKING_EMBED_URL
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_THREE_CX_ENABLED=$NEXT_PUBLIC_THREE_CX_ENABLED
ENV NEXT_PUBLIC_THREE_CX_PBX_FQDN=$NEXT_PUBLIC_THREE_CX_PBX_FQDN
ENV NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK=$NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK
ENV NEXT_PUBLIC_THREE_CX_IGNORE_HOURS=$NEXT_PUBLIC_THREE_CX_IGNORE_HOURS
ENV NEXT_PUBLIC_THREE_CX_WEB_CLIENT_URL=$NEXT_PUBLIC_THREE_CX_WEB_CLIENT_URL
ENV NEXT_PUBLIC_CRM_MESSAGERIE_ENABLED=$NEXT_PUBLIC_CRM_MESSAGERIE_ENABLED

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Chromium pour génération PDF (contrats, devis, factures)
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-dejavu \
      font-noto \
      fontconfig \
    && fc-cache -f

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations

RUN mkdir -p public/uploads/blog && chown -R nextjs:nodejs public/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

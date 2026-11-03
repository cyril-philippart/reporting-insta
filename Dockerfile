FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs \
    && mkdir -p /app/data /ms-playwright \
    && chown -R nextjs:nodejs /app/data /ms-playwright
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=dependencies /app/node_modules/playwright ./node_modules/playwright
COPY --from=dependencies /app/node_modules/playwright-core ./node_modules/playwright-core
RUN npx playwright install --with-deps chromium \
    && chown -R nextjs:nodejs /ms-playwright
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

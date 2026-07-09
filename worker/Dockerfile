# Playwright's official Node image ships Chromium and all system deps.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm install typescript --no-save && npx tsc

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]

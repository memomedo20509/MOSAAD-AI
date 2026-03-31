FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_META_APP_ID
ENV VITE_META_APP_ID=$VITE_META_APP_ID

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]

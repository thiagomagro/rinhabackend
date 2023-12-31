# FROM alpine:3.14
FROM oven/bun:alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY tsconfig.json .
# COPY public public

EXPOSE 3000
ENV NODE_ENV production
CMD ["bun", "src/index.ts"]


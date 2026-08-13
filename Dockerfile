FROM node:24-alpine AS base
WORKDIR /usr/src/app
RUN mkdir -p /tessdata && \
    wget -q -O /tessdata/spa.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/spa.traineddata && \
    wget -q -O /tessdata/eng.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=build /usr/src/app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /tessdata /tessdata
EXPOSE 3000
CMD ["node", "dist/main"]

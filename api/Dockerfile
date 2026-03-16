# ---- Build Stage ----
FROM node20-alpine AS build

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package*.json ./
RUN npm install

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build




# ---- Production Stage ----
FROM node:20-alpine as prod

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JS from builder
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
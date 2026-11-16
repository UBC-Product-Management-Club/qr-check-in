# Stage 1: build the static site
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Includes .secret/.env, written by the deploy workflow. Vite bakes those values
# into the build, so they must be here now, not set on the running container.
COPY . .
RUN npm run build

# Stage 2: serve it
FROM node:22-alpine
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist

# -s sends every path to index.html (routing is client-side). Cloud Run sets PORT.
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]

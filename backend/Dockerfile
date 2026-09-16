# # ── Stage 1: Build ─────────────────────────────────────────────────────────────
# FROM node:20-alpine AS builder

# WORKDIR /app

# # Install dependencies (including devDependencies for build)
# COPY package*.json ./
# RUN npm ci

# # Copy source and build
# COPY . .
# RUN npm run build

# # Prune devDependencies for production runtime
# RUN npm prune --production

# # ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# FROM node:20-alpine AS runner

# WORKDIR /app

# ENV NODE_ENV=production

# # Copy node_modules and built dist from builder stage
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/dist ./dist

# EXPOSE 3000

# CMD ["node", "dist/main"]





FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci

COPY backend ./backend

RUN npm run build --workspace=backend

RUN npm prune --production

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3000

CMD ["node", "backend/dist/main"]

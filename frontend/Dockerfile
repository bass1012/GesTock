# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend ./frontend

WORKDIR /app/frontend

# Build Vite app
# Note: VITE_ variables must be available at build time for Vite
ARG VITE_INACTIVITY_TIMEOUT_MINUTES=120
ENV VITE_INACTIVITY_TIMEOUT_MINUTES=$VITE_INACTIVITY_TIMEOUT_MINUTES
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration for SPA
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install dependencies (ci = reproducible, uses package-lock.json)
RUN npm ci

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

# Production stage — rootless nginx
FROM nginx:stable-alpine

# Fix permissions for non-root nginx user (port 8080, no CAP_NET_BIND_SERVICE needed)
RUN mkdir -p /var/run && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration for SPA
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

# Build stage
FROM node:18-alpine AS builder

# Install essential build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:1.25-alpine AS production

ARG ENV=local

# Copy nginx config and built assets
COPY --from=builder /app/dist /usr/share/nginx/html/
COPY --from=builder /app/public/robots.txt /usr/share/nginx/html/
COPY nginx.${ENV}.conf /etc/nginx/nginx.conf
COPY nginx.${ENV}.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

RUN echo "ENV: ${ENV}"
RUN ls -la /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

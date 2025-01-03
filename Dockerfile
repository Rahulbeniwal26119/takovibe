# Build stage
FROM node:18-alpine AS builder

# Install essential build tools (for node-gyp or other dependencies)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files early for dependency caching
COPY package*.json ./

# Install dependencies with npm
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Build the Astro application
RUN npm run build

# Use a lightweight base image for production
FROM nginx:1.25-alpine AS production

# Remove default nginx config and copy custom configuration (if needed)
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set permissions to avoid potential issues
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Healthcheck to ensure the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

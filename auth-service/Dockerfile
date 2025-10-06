# =====================================================
# auth-service/Dockerfile
# Entorno de producción
# =====================================================

# --- Stage 1: Build ---
# Use a base image with all the development tools
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency configuration files
COPY package*.json ./

# Install ALL dependencies (including dev) to compile
RUN npm ci

# Copy the rest of the code and build
COPY . .
RUN npm run build

# --- Stage 2: Production ---
# Use a new, lighter base image for the production environment
FROM node:18-alpine

WORKDIR /app

# Copy only production files
COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production

# Copy the compiled JS files from the previous build stage
COPY --from=builder /app/dist ./dist

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with the compiled code
CMD ["npm", "start"]

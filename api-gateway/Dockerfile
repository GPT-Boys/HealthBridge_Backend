FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# # Copy built files and dependencies
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package*.json ./

# # Create logs directory
# RUN mkdir -p logs

# # Set environment
# ENV NODE_ENV=production
# ENV PORT=3000

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

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
# CMD ["node", "dist/index.js"]
CMD ["npm", "start"]
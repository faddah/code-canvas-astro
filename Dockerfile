# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM --platform=linux/amd64 node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
# Using npm install instead of npm ci to handle version mismatches
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM --platform=linux/amd64 node:20-alpine AS runtime

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json for runtime info (optional but good practice)
COPY --from=builder /app/package.json ./package.json

# Copy initialization and seeding scripts
COPY --from=builder /app/scripts ./scripts

# Make entrypoint script executable
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Create directory for database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with initialization
CMD ["/app/scripts/docker-entrypoint.sh"]
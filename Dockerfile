# Multi-stage Dockerfile for GitHub SOPS Bot
# Builds Node.js/TypeScript Probot application using yarn

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gnupg \
    git

# Install yarn globally
RUN npm install -g yarn

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies using yarn
RUN yarn install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN yarn build

# Runtime stage
FROM node:18-alpine AS runtime

# Install runtime dependencies (GPG for key generation)
RUN apk add --no-cache \
    gnupg \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built JavaScript from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S probot -u 1001

# Change ownership
RUN chown -R probot:nodejs /app

USER probot

# Expose port (Probot default is 3000)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/probot', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run Probot with compiled JavaScript
# Probot run can handle compiled JS files
CMD ["yarn", "start"]


# Single-stage build for Gemini Router
# Author: jizhejiang
# Date: 2025-08-11

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies as root user to ensure proper permissions
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy application code
COPY . .

# Copy Docker-specific environment variables file
# If .dev.vars.docker exists, use it as .dev.vars in container
RUN if [ -f .dev.vars.docker ]; then cp .dev.vars.docker .dev.vars; fi

# Force reinstall workerd for the correct platform
RUN npm uninstall workerd && \
    npm install workerd --save-dev && \
    npx wrangler --version

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8787/ || exit 1

# Set environment variables
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application directly with npm
CMD ["npm", "run", "dev"]

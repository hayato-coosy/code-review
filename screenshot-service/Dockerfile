# Use a Node.js base image with Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:21.0.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip Chromium download as it's already in the image)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci --only=production

# Copy application code
COPY server.js ./

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]

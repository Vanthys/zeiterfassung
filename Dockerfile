FROM node:20-alpine

# Install dependencies (removed build tools, only keeping sqlite runtime)
RUN apk add --no-cache sqlite

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=http://localhost:5000

WORKDIR /web
COPY web/ .  
# Set the environment variable for Vite to use during build
ENV VITE_API_URL=${VITE_API_URL}
RUN npm install && npm run build

WORKDIR /app
COPY app/ .  

# Install dependencies with pre-built binaries (much faster)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy and set permissions for entrypoint script
COPY app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/docker-entrypoint.sh"]
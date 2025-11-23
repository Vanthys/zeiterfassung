FROM node:20-alpine

# Install dependencies (removed build tools, only keeping sqlite runtime)
RUN apk add --no-cache sqlite

WORKDIR /web
COPY web/ .  
RUN npm install && npm run build

WORKDIR /app
COPY app/ .  

# Install dependencies with pre-built binaries (much faster)
RUN npm install

EXPOSE 5000

CMD ["node", "server.js"]
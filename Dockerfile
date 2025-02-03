FROM node:20-alpine

#dependencies
RUN apk add --no-cache python3 py3-pip make g++ sqlite sqlite-dev

WORKDIR /web
COPY web/ .  
RUN npm install && npm run build

WORKDIR /app
COPY app/ .  

RUN npm install --build-from-source sqlite3
RUN npm rebuild sqlite3 --build-from-source

EXPOSE 5000

CMD ["node", "server.js"]
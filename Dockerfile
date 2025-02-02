FROM node:20-alpine
WORKDIR /web
COPY . .
RUN npm install --production
RUN npm run build
WORKDIR /app
RUN npm install --production
RUN npm run build
CMD ["node", "src/index.js"]

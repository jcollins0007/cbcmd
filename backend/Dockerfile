FROM node:20-alpine
RUN apk add --no-cache wget postgresql16-client
WORKDIR /app
RUN mkdir -p /app/snapshots /app/uploads
COPY package.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 4000
CMD ["node", "src/server.js"]

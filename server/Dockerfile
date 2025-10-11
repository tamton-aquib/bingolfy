FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

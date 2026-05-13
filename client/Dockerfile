# build stage
FROM node:20-alpine AS build
WORKDIR /app
ENV VITE_SOCKET_URL=wss://bingolfy.tamton.dev/game
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

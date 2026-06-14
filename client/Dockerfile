# build stage
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_SOCKET_URL=wss://bingolfy.tamton.dev/game
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# production stage
FROM nginx:alpine
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
RUN chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
USER appuser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

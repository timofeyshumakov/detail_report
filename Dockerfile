# syntax=docker/dockerfile:1

# Сборка фронтенда (Vite)
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build

# Продакшен: статика + nginx
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

RUN rm -f /etc/nginx/conf.d/default.conf && \
    printf '%s\n' \
      'server {' \
      '    listen 80;' \
      '    listen [::]:80;' \
      '    server_name _;' \
      '    root /usr/share/nginx/html;' \
      '    index index.html;' \
      '    gzip on;' \
      '    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;' \
      '    location / {' \
      '        try_files $uri $uri/ /index.html;' \
      '    }' \
      '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {' \
      '        try_files $uri =404;' \
      '        expires 7d;' \
      '        add_header Cache-Control "public, immutable";' \
      '    }' \
      '}' \
      > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

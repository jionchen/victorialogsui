# Stage 1: Build
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/nginx:alpine

USER root
COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY nginx/entrypoint.sh /entrypoint.sh
COPY --from=builder /app/dist /usr/share/nginx/html/vlogs-ui
RUN chmod +x /entrypoint.sh && \
    chown -R nginx:nginx /etc/nginx/conf.d /usr/share/nginx/html/vlogs-ui /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]

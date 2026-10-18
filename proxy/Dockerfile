# Nginx as a non-root user. Port 80 is allowed for non-root because
# docker-compose sets net.ipv4.ip_unprivileged_port_start=0 for this container.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

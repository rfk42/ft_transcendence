# nginx/Dockerfile
FROM nginx:alpine

RUN apk add --no-cache openssl curl

COPY tools/nginx.conf /etc/nginx/conf.d/default.conf

COPY tools/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443
CMD ["/entrypoint.sh"]

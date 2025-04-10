FROM alpine:3.20

RUN apk add --no-cache \
    curl \
    bash \
    dcron

WORKDIR /app

COPY crontab/check_inactive_users_cron /etc/cron.d/check_inactive_users_cron

RUN chmod 0644 /etc/cron.d/check_inactive_users_cron

RUN crontab /etc/cron.d/check_inactive_users_cron

CMD ["crond", "-f"]
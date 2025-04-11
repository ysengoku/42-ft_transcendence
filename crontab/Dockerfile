FROM python:3.11-alpine

RUN apk update --no-interactive && apk upgrade --no-interactive \
    && apk add --no-cache \
    bash \
    # python3 py3-pip \
    # curl \
    cronie

WORKDIR /app

# RUN python -m venv /app/venv

# COPY ./requirements.txt /app/requirements.txt
# RUN pip install --no-cache-dir -r /app/requirements.txt

COPY crontab/cronjob /etc/cron.d/cronjob
RUN mkdir -p /app/scripts
COPY ./scripts/check_inactive_users_cron.py /app/scripts/

RUN chmod 0644 /etc/cron.d/cronjob && \
    crontab /etc/cron.d/cronjob

# COPY ./scripts/ .
# RUN mkdir -p /app/scripts
# COPY ./scripts/check_inactive_users.sh /app/scripts/
# RUN chmod 0644 /etc/cron.d/cronjob && crontab /etc/cron.d/cronjob
# RUN chmod 0777 /app/scripts/check_inactive_users.sh
#
CMD ["crond", "-f"]

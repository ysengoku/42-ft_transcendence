FROM python:3.11-alpine

RUN apk update --no-interactive && apk upgrade --no-interactive \
    && apk add --no-cache \
    bash \
    python3 \
#    python3 py3-pip  \
    # curl \
    cronie


WORKDIR /app

# COPY ./requirements.txt /app/requirements.txt
# RUN pip install --no-cache-dir -r /app/requirements.txt

COPY crontab/cronjob /etc/cron.d/cronjob
RUN mkdir -p /app/scripts
RUN mkdir -p /var/log/
RUN touch /var/log/cron.log

COPY requirements.txt .
RUN pip config set global.no-cache-dir true
RUN pip config set global.no-warn-script-location true
RUN python3 -m ensurepip --upgrade \
    && pip install --upgrade pip
RUN pip install -r requirements.txt
# Export env variables for cron
RUN printenv > /etc/environment
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

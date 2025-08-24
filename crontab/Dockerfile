FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    cron \
    bash

WORKDIR /app

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

COPY ./scripts/check_inactive_users_cron.py /app/scripts/
COPY ./crontab_init.sh /app
RUN chmod +x ./crontab_init.sh

RUN chmod 0644 /etc/cron.d/cronjob && \
    crontab /etc/cron.d/cronjob

ENTRYPOINT ["./crontab_init.sh"]
CMD ["cron", "-f"]

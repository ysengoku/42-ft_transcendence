FROM python:3.10-slim

# libpq-dev and gcc are required for the communication between Python and PostgreSQL (psycopg2 package)
# libmagic1 is required for the image manipulation and validation withing django server
# procps for monitoring processes within the docker container
# && rm -rf /var/lib/apt/lists/* for the best practice of keeping the Docker image lean
RUN apt-get update && apt-get install -y \
    libpq-dev \
    procps \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# It's important to chmox the script
ENV chmox="chmod +x"
RUN $chmox ./django_init.sh

EXPOSE 8000

# entrypoint script runs the workers and does cleanups after database shutdowns
ENTRYPOINT ["./django_init.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "server.asgi:application"]

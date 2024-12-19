# Utiliser une image de base minimaliste avec les outils nécessaires
FROM debian:bullseye-slim

# Mettre à jour les packages et installer inotify-tools
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    libtool \
    autoconf \
    pkg-config \
    && wget https://github.com/inotify-tools/inotify-tools/releases/download/3.22.7.0/inotify-tools-3.22.7.0.tar.gz \
    && tar -xvzf inotify-tools-3.22.7.0.tar.gz \
    && cd inotify-tools-3.22.7.0 \
    && ./configure --prefix=/usr/local \
    && make \
    && make install \
    && rm -rf /inotify-tools-3.22.7.0.tar.gz /inotify-tools-3.22.7.0

# Définir le répertoire de travail
WORKDIR /root

# Définir le point d'entrée pour surveiller les changements de fichiers
ENTRYPOINT ["inotifywait", "-m", "-e", "modify", "/app"]

# 基本イメージとしてAmazon Linux 2023を使用
FROM amazonlinux:2023

# 環境変数
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 16.13.0
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
ENV REDIS_VERSION 6.2.6
ENV POSTGRE_VERSION 15

# 必要なソフトウェアと依存関係のインストール
RUN yum update -y && \
    yum install -y tar xz git && \
    yum groupinstall -y "Development Tools"

# NVMのインストール
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# NVMとNode.jsの環境設定
RUN . "$NVM_DIR/nvm.sh" && nvm install $NODE_VERSION && nvm use $NODE_VERSION && nvm alias default $NODE_VERSION

# TypeScriptのインストール
RUN npm install -g typescript

# PostgreSQLのインストール
RUN yum install -y postgresql$POSTGRE_VERSION-server.x86_64 postgresql$POSTGRE_VERSION-server-devel.x86_64

# Redisのソースコードをダウンロード:
RUN curl -O http://download.redis.io/releases/redis-$REDIS_VERSION.tar.gz
RUN tar xzf redis-$REDIS_VERSION.tar.gz && \
    cd redis-$REDIS_VERSION
RUN cd redis-$REDIS_VERSION && \
    make
RUN cp redis-$REDIS_VERSION/src/redis-server /usr/local/bin/ && \
    cp redis-$REDIS_VERSION/src/redis-cli /usr/local/bin/
RUN echo '#!/bin/bash\nredis-server &' > /start-redis.sh && \
    chmod +x /start-redis.sh
RUN redis-server --version

# Memcachedのインストール
RUN yum install -y memcached

# アプリケーションのソースコードをコンテナにコピー
COPY . /app
WORKDIR /app

# Node.js依存関係のインストール
RUN npm install

# TypeScriptコンパイル
RUN tsc

# Docker Listen Port
EXPOSE 3000

# アプリケーションの起動コマンド
CMD ["/start-redis.sh", "&&", "node", "dist/app.js"]

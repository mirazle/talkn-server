# 環境構築(Mac)

dmg をインストールしてデーモンを実行
https://docs.docker.com/desktop/install/mac-install/

```
brew install docker
docker login
docker-compose build
docker-compose up
```

# ローカル開発

## talkn-common

talkn-common リポジトリを clone します。

## redis-server

1 つの ch はクラスター構成に必要な最低 6 つの redis-server を持ちます。

```
redis-cli shutdown
pkill -f redis-server

redis-server redis/6380/redis-server.conf &
redis-server redis/6381/redis-server.conf &
redis-server redis/6382/redis-server.conf &
redis-server redis/6383/redis-server.conf &
redis-server redis/6384/redis-server.conf &
redis-server redis/6385/redis-server.conf &

redis-cli -p 6380 FLUSHALL
redis-cli -p 6380 CLUSTER RESET
redis-cli -p 6381 FLUSHALL
redis-cli -p 6381 CLUSTER RESET
redis-cli -p 6382 FLUSHALL
redis-cli -p 6382 CLUSTER RESET
redis-cli -p 6383 FLUSHALL
redis-cli -p 6383 CLUSTER RESET
redis-cli -p 6384 FLUSHALL
redis-cli -p 6384 CLUSTER RESET
redis-cli -p 6385 FLUSHALL
redis-cli -p 6385 CLUSTER RESET

echo "yes" | redis-cli --cluster create 127.0.0.1:6380 127.0.0.1:6381 127.0.0.1:6382 127.0.0.1:6383 127.0.0.1:6384 127.0.0.1:6385 --cluster-replicas 1

ps aux | grep redis-server | grep -v grep
lsof -i :6379

redis-cli shutdown
pkill -f redis-server

```

TCP バックログ(待ち受け可能な TCP セッション数)の OS のデフォルト値は 128 ですが、Redis のデフォルトでは 511 が指定されているため、OS のバックログを拡張します。

```
sudo sysctl -w kern.ipc.somaxconn=512
sysctl kern.ipc.somaxconn
```

## apache-kafka

redis だけだと ch 同士の通信を行う際に単一障害点が発生してしまうので。
このコマンドにより、Kafka と ZooKeeper がインストールされます。Kafka は ZooKeeper を使用してクラスターの状態を管理します。

```
brew install kafka
brew services start zookeeper
brew services start kafka
```

トピックの作成

```
kafka-topics --create --topic test --partitions 1 --replication-factor 1 --bootstrap-server localhost:9092
```

プロデューサーからのメッセージ送信

```
kafka-console-producer --topic test --bootstrap-server localhost:9092
```

コンシューマーでのメッセージ受信。別のターミナルウィンドウを開いて、以下のコマンドを実行します。

```
kafka-console-consumer --topic test --from-beginning --bootstrap-server localhost:9092
```

## jq

```
brew install jq
```

brew install だと最新しかインストール出来ない。

2024 年 2 月時点の stable バージョンをソースからインストールします。
Stable release
1.21.4.2 / June 21, 2023;

## open-resty

```
curl -O https://openresty.org/download/openresty-1.21.4.2.tar.gz
tar -zxvf openresty-1.21.4.2.tar.gz
cd openresty-1.21.4.2
brew install pcre openssl zlib
./configure --with-pcre-jit --with-http_ssl_module --with-http_v2_module --with-cc-opt="-I$(brew --prefix openssl)/include" --with-ld-opt="-L$(brew --prefix openssl)/lib"
make -j$(nproc)
sudo make install

echo 'export PATH=/usr/local/openresty/bin:$PATH' >> ~/.bash_profile
source ~/.bash_profile
```

```
brew tap openresty/brew
brew install openresty
brew install openresty-debug
brew install lua
brew install luarocks

luarocks install lua-resty-http
luarocks install lua-resty-core
opm get openresty/lua-resty-core

openresty -v
openresty -c $(pwd)/nginx/nginx.conf
openresty -s reload
lsof -i :10443
kill -9 $(lsof -t -i:10443)

openresty -s stop
```

下記で取得出来る LUA_PATH, LUA_CPATH を export 付きで実行して環境変数を設定。

```
luarocks path
```

下記で、nginx 経由でなくローカル実行。

```
resty -e 'package.path="/Users/JPZ7123/talkn-server/nginx/?.lua;" .. package.path' -e 'require("dynamic_routing")'
```

注意：
LuaJIT は Lua 5.1 の言語機能と互換性があります

MEMO

```
/usr/local/Cellar/openresty/1.25.3.1_1/nginx/logs/error.log
```

## Node

```
TOP_CONNECTION=/ npm run dev
TOP_CONNECTION=/aa.com/ npm run dev
```

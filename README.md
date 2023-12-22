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

6379 が rootServer。それ以外は chServer です。
rootServer は起動。chServer は必要に応じて起動します。

```
redis-server --port 6379
redis-server --port 6380
```

## Node

`npm run dev`

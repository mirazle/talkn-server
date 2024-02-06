#!/bin/sh

# JSONファイルのパス
INPUT_JSON_FILE="contracts.json"

SOCKET_IO_PATH="/socket.io"

# nginx.confファイルへの出力パス
NGINX_CONF="nginx/nginx.conf"

{
cat << 'EOF'
# user  staff;
worker_processes  1;

error_log  /Users/JPZ7123/talkn-server/logs/error.log;

events {
  worker_connections  1024;
}

http {
  server {
    listen 10443 ssl;
    server_name 127.0.0.1;
    access_log  /Users/JPZ7123/talkn-server/logs/access.log;

    ssl_certificate     ../../talkn-common/certs/localhost.crt;
    ssl_certificate_key ../../talkn-common/certs/localhost.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Access-Control-Allow-Origin "*";
    proxy_set_header Access-Control-Allow-Methods "POST, GET, PUT, DELETE, OPTIONS";
    proxy_set_header Access-Control-Allow-Headers "DNT, X-Mx-ReqToken, Keep-Alive, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type";
    proxy_set_header Access-Control-Allow-Credentials true; 

EOF

# JSONから設定を読み込み、locationブロックを生成
jq -r --arg socket_io_path "$SOCKET_IO_PATH" '.[] | "    location \(.nginx.location) {\n      proxy_pass https://\(.nginx.proxyWssServer):\(.nginx.proxyWssPort)\($socket_io_path)\(.nginx.location);\n    }"' $INPUT_JSON_FILE


cat << 'EOF'
    location / {
      proxy_pass https://127.0.0.1:10444/socket.io/;
    }
  }
}
EOF
} > $NGINX_CONF

openresty -s stop
openresty -c $(pwd)/nginx/nginx.conf

echo "nginx.conf has been generated & boot."
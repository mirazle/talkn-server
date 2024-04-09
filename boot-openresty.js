const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const homeDirectory = os.homedir();
const INPUT_JSON_FILE = path.join(__dirname, 'ch-config.json');
const NGINX_CONF_PATH = path.join(__dirname, 'nginx', 'nginx.conf');

// JSONデータを読み込む
const jsonData = JSON.parse(fs.readFileSync(INPUT_JSON_FILE, 'utf8'));

let nginxConfig = `
# user  staff;
worker_processes  1;

error_log  ${homeDirectory}/talkn-server/logs/error.log;
pid ${homeDirectory}/talkn-server/nginx/nginx.pid;

worker_rlimit_nofile 83000;

events {
  worker_connections 4096;
}

http {
  server {
    listen 10443 ssl;
    server_name 127.0.0.1;
    access_log  ${homeDirectory}/talkn-server/logs/access.log;

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
`;

// トップレベルの location を追加
nginxConfig += `
    location ${jsonData.nginx.location} {
      proxy_pass https://${jsonData.nginx.proxyWssServer}:${jsonData.nginx.proxyWssPort}/socket.io${jsonData.nginx.location};
    }
`;

// 再帰的に children を処理して nginx.conf に追加する関数
function appendLocations(data, prefix = '') {
  data.children.forEach((child) => {
    const fullPath = prefix + child.nginx.location;
    nginxConfig += `
    location /${fullPath} {
      proxy_pass https://${child.nginx.proxyWssServer}:${child.nginx.proxyWssPort}/socket.io/${fullPath};
    }
`;
    if (child.children && child.children.length > 0) {
      appendLocations(child, fullPath); // 再帰的に子要素を処理
    }
  });
}

// トップレベルから children の処理を開始
appendLocations(jsonData);

// nginx.conf の終了部分を追加
nginxConfig += `
  }
}
`;

// nginx.conf ファイルに書き込む
fs.writeFileSync(NGINX_CONF_PATH, nginxConfig, 'utf8');

console.log(`nginx.conf has been generated at ${NGINX_CONF_PATH}`);

// OpenRestyの停止と再起動
const restartOpenResty = () => {
  console.log('Stopping OpenResty...');
  exec('openresty -s stop', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error stopping OpenResty: ${error}`);
      // return;
    }
    console.log('OpenResty stopped. Starting with new configuration...');
    exec(`openresty -c ${NGINX_CONF_PATH}`, (startError, startStdout, startStderr) => {
      if (startError) {
        console.error(`Error starting OpenResty: ${startError}`);
        return;
      }
      console.log('OpenResty started with new configuration.');
    });
  });
};

restartOpenResty();

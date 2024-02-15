import fs from 'fs';
import os from 'os';

const homeDir = os.homedir();
const isDocker = process.env.IS_DOCKER;
const localhostPemKey = `${homeDir}/talkn-common/certs/localhost.key`;
const localhostPemCrt = `${homeDir}/talkn-common/certs/localhost.crt`;
const productPemKey = '/etc/letsencrypt/live/talkn.io/privkey.pem';
const productPemCrt = '/etc/letsencrypt/live/talkn.io/cert.pem';
const sslKey = isDocker ? productPemKey : localhostPemKey;
const sslCrt = isDocker ? productPemCrt : localhostPemCrt;

const conf = {
  serverOption: {
    cors: { credentials: true },
  },
  io: {
    proxy: { host: 'localhost', port: 10443 },
    root: { host: 'localhost', port: 10444 },
    ch: { host: 'localhost', port: 10445 },
  },
  redis: {
    limit: 20,
    root: { host: 'localhost', port: 6379 },
    ch: { host: 'localhost', port: 6380 },
  },
  ssl: { key: fs.readFileSync(sslKey), cert: fs.readFileSync(sslCrt) },
};

export default conf;

import fs from 'fs';
import os from 'os';

const homeDir = os.homedir();
const isDocker = process.env.IS_DOCKER
const localhostPemKey = `${homeDir}/talkn-common/certs/localhost.key`;
const localhostPemCrt = `${homeDir}/talkn-common/certs/localhost.crt`;
const productPemKey = '/etc/letsencrypt/live/talkn.io/privkey.pem';
const productPemCrt = '/etc/letsencrypt/live/talkn.io/cert.pem';
const sslKey = isDocker ? productPemKey: localhostPemKey;
const sslCrt = isDocker ? productPemCrt :localhostPemCrt;

const conf = {
	io: { host: 'localhost', port: 10443 },
	redis: { host: 'localhost', port: 6379 },
	ssl: { key: fs.readFileSync(sslKey), cert: fs.readFileSync(sslCrt) }
}

export default conf;

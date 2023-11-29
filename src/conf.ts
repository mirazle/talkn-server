import fs from 'fs';
import os from 'os';

const homeDir = os.homedir();
const localhostPemKey = `${homeDir}/talkn/common/pems/localhost.key`;
const localhostPemCrt = `${homeDir}/talkn/common/pems/localhost.crt`;
const productPemKey = '/etc/letsencrypt/live/talkn.io/privkey.pem';
const productPemCrt = '/etc/letsencrypt/live/talkn.io/cert.pem';
const productPemChain = '/etc/letsencrypt/live/talkn.io/chain.pem';

const sslKey = localhostPemKey;
const sslCrt = localhostPemCrt;
const conf = {
	io: { host: 'localhost', port: 10443 },
	redis: { host: 'localhost', port: 6379 },
	ssl: { key: fs.readFileSync(sslKey), cert: fs.readFileSync(sslCrt) }
}

export default conf;

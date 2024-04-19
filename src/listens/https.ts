import https from 'https';

import conf from '@server/conf';

const { io, ssl } = conf;

const getHttpsServer = async (port: number): Promise<https.Server> => {
  return new Promise((resolve) => {
    const httpsServer = https.createServer(ssl);
    httpsServer.listen(port, () => {
      resolve(httpsServer);
    });
  });
};

export default getHttpsServer;

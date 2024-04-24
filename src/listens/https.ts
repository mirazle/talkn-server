import https from 'https';

import conf from '@server/conf';
import ChModel, { Connection } from '@common/models/Ch';
import { ChConfig } from '@common/models/ChConfig';

const { io, ssl } = conf;

const getHttpsServer = async (topConnection: Connection, myChConfig: ChConfig): Promise<https.Server> => {
  const isRootConnection = topConnection === ChModel.rootConnection;
  const ioPort = isRootConnection ? Number(io.root.port) : Number(myChConfig?.nginx.proxyWssPort);
  return new Promise((resolve, reject) => {
    const httpsServer = https.createServer(ssl);
    httpsServer
      .listen(ioPort, () => {
        resolve(httpsServer);
      })
      .on('error', (err) => {
        console.error('listens.https.ts Error occurred:', err);
      });
  });
};

export default getHttpsServer;

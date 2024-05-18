import fs from 'fs';

import Ch from '@common/models/Ch';
import ChConfigModel, { ChConfigJson } from '@common/models/ChConfig';
import TalknIo from '@server/listens/io';
import listens from '@server/listens';
import { Socket } from 'socket.io';
import endpoints from './endpoints';
import { isValidKey } from '@common/utils';

const topConnection = process.env.TOP_CONNECTION ? Ch.getConnection(process.env.TOP_CONNECTION) : Ch.rootConnection;

fs.readFile('ch-config.json', 'utf8', async (err, json) => {
  if (err) console.error(err);

  try {
    const chConfigJson = JSON.parse(json) as ChConfigJson;
    const myChConfig = ChConfigModel.getMyChConfig({ chConfigJson, topConnection });
    const myChRootsConfig = ChConfigModel.getChRootsConfig({ chConfigJson, tuneConnection: topConnection });

    console.info('@@@@@@@@@@@ TOP CONNECTION @@@@@@@@@@@');
    console.info(topConnection, myChConfig.nginx.proxyWssServer, myChConfig.nginx.proxyWssPort);
    console.info('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

    const listend = await listens(topConnection, myChConfig);
    const talknIo = new TalknIo(topConnection, chConfigJson, myChConfig, myChRootsConfig, listend);

    const connectioned = (socket: Socket) => {
      if (socket.connected) {
        attachEndpoints(socket);
        const requestState = {};
        endpoints.tune(talknIo, socket, myChConfig, requestState);
      }
    };

    const attachEndpoints = (socket: Socket) => {
      Object.keys(endpoints).forEach((endpoint) => {
        socket.on(endpoint, (requestState: any) => {
          if (isValidKey(endpoint, endpoints)) {
            endpoints[endpoint](talknIo, socket, myChConfig, requestState);
          }
        });
      });
    };

    talknIo.server.of(TalknIo.namespace).on('connection', connectioned);
  } catch (error) {
    console.error(error);
  }
});

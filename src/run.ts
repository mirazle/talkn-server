import { Socket } from 'socket.io';
import fs from 'fs';

import { isValidKey } from '@common/utils';
import Ch from '@common/models/Ch';
import ChConfigModel, { ChConfigJson } from '@common/models/ChConfig';
import TalknIo from '@server/listens/io';
import endpoints from '@server/endpoints';

import conf from '@server/conf';
import listens from '@server/listens';

const { io } = conf;
const topConnection = process.env.TOP_CONNECTION ? Ch.getConnection(process.env.TOP_CONNECTION) : Ch.rootConnection;
const isRootConnection = topConnection === Ch.rootConnection;

fs.readFile('ch-config.json', 'utf8', async (err, json) => {
  if (err) console.error(err);

  try {
    const chConfigJson = JSON.parse(json) as ChConfigJson;
    const myChConfig = ChConfigModel.getMyChConfig({ chConfigJson, topConnection });
    const myChRoots = ChConfigModel.getMyChRoots({ chConfigJson, topConnection });

    const ioPort = isRootConnection ? Number(io.root.port) : Number(myChConfig?.nginx.proxyWssPort);
    const listend = await listens(ioPort, myChConfig);
    const talknIo = new TalknIo(topConnection, listend, myChConfig);

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

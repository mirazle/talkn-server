import { Socket } from 'socket.io';
import fs from 'fs';

import { isValidKey } from '@common/utils';
import Ch from '@common/models/Ch';
import { Contract } from '@common/models/Contract';
import TalknIo from '@server/listens/io';
import endpoints from '@server/endpoints';

import conf from '@server/conf';
import listens from '@server/listens';

const { io } = conf;
const topConnection = process.env.TOP_CONNECTION ? Ch.getConnection(process.env.TOP_CONNECTION) : Ch.rootConnection;
const isRootConnection = topConnection === Ch.rootConnection;

fs.readFile('contracts.json', 'utf8', async (err, json) => {
  if (err) console.error(err);

  try {
    const contracts = JSON.parse(json) as Contract[];
    const contract = contracts.find((contract) => contract.nginx.location === topConnection);
    const ioPort = !isRootConnection && Boolean(contract) ? Number(contract?.nginx.proxyWssPort) : Number(io.root.port);

    const listend = await listens(ioPort, contract);
    const talknIo = new TalknIo(topConnection, listend);

    const connectioned = (socket: Socket) => {
      if (socket.connected) {
        attachEndpoints(socket);
        const requestState = {};
        endpoints.tune(talknIo, socket, contract, requestState);
      }
    };

    const attachEndpoints = (socket: Socket) => {
      Object.keys(endpoints).forEach((endpoint) => {
        socket.on(endpoint, (requestState: any) => {
          if (isValidKey(endpoint, endpoints)) {
            endpoints[endpoint](talknIo, socket, contract, requestState);
          }
        });
      });
    };

    talknIo.server.of(TalknIo.namespace).on('connection', connectioned);
  } catch (error) {
    console.error(error);
  }
});

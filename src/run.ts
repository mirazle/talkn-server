import { Socket } from 'socket.io';

import { Setting, init as settingInit } from '@common/models/Setting';
import { isValidKey } from '@common/utils';
import Ch from '@common/models/Ch';
import TalknIo from '@server/listen';
import endpoints from '@server/endpoints';
import { getOpenPort } from '@server/listen';
import conf from '@server/conf';

const { io } = conf;
const topConnection = process.env.TOP_CONNECTION ? Ch.getConnection(process.env.TOP_CONNECTION) : Ch.rootConnection;
const ioRootPort = io.root.port;

const run = async () => {
  const ioPort = topConnection === Ch.rootConnection ? ioRootPort : await getOpenPort(ioRootPort + 1);
  const talknIo = new TalknIo(topConnection, ioPort);
  const setting: Setting = settingInit; // TODO connect postgresql

  console.log('@@@@@', ioPort, 'TOP_CONNECTION', topConnection);

  const connectioned = (socket: Socket) => {
    if (socket.connected) {
      attachEndpoints(socket, setting);
      endpoints.tune(talknIo, socket, {}, setting);
    }
  };

  const attachEndpoints = (socket: Socket, setting: Setting) => {
    Object.keys(endpoints).forEach((endpoint) => {
      socket.on(endpoint, (requestState: any) => {
        if (isValidKey(endpoint, endpoints)) {
          endpoints[endpoint](talknIo, socket, requestState, setting);
        }
      });
    });
  };

  talknIo.server.of(TalknIo.namespace).on('connection', connectioned);
};

run();

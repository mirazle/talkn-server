import { Socket } from "socket.io";

import { Setting, init as settingInit } from "@common/models/Setting";
import Ch from "@common/models/Ch";
import { isValidKey } from "@common/utils";
import TalknIo from "@server/listen";
import endpoints from "@server/endpoints";

const talknIo = new TalknIo(process.env.CONNECTION);
const setting: Setting = settingInit; // TODO connect postgresql

const connectioned = (socket: Socket) => {
  if (socket.connected) {
    attachEndpoints(socket, setting);
    endpoints.tune(socket, {}, setting);
  }
};

const attachEndpoints = (socket: Socket, setting: Setting) => {
  console.log("NSP", socket.nsp.name);
  Object.keys(endpoints).forEach((endpoint) => {
    socket.on(endpoint, (requestState: any) => {
      if (isValidKey(endpoint, endpoints)) {
        endpoints[endpoint](socket, requestState, setting);
      }
    });
  });
};

talknIo.rootServer.of(Ch.rootConnection).on("connection", connectioned);
talknIo.chServer.of(talknIo.connection).on("connection", connectioned);

import { Socket } from "socket.io";

import { Setting, init as settingInit } from "@common/models/Setting";
import { isValidKey } from "@common/utils";
import TalknIo from "@server/listen";
import endpoints from "@server/endpoints";

const talknIo = new TalknIo(process.env.CONNECTION);
const setting: Setting = settingInit; // TODO connect postgresql

talknIo.chServer.of(talknIo.connection).on("connection", (socket: Socket) => {
  attachEndpoints(socket, setting);
  endpoints.tune(socket, {}, setting);
});

const attachEndpoints = (socket: Socket, setting: Setting) => {
  Object.keys(endpoints).forEach((endpoint) => {
    socket.on(endpoint, (requestState: any) => {
      if (isValidKey(endpoint, endpoints)) {
        endpoints[endpoint](socket, requestState, setting);
      }
    });
  });
};

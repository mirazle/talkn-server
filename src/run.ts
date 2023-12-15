import Sequence from "@common/Sequence";
import { isValidKey } from "@common/utils";
import TalknIo from "@server/listens/io";
import { Socket } from "socket.io";
import endpoints from "./endpoints";
import { RequestState } from "./endpoints/tune";
import { Setting, init as settingInit } from "./common/models/Setting";

const talknIo = new TalknIo();
const setting: Setting = settingInit; // TODO connect postgresql

talknIo.server.on("connection", (socket: Socket) => {
  attachApiForUser(socket, setting);

  const { handshake } = socket;
  const host = String(handshake.headers.host);
  const connection = String(handshake.query.connection);
  const requestState: RequestState = { host, connection };
  endpoints.tune(socket, requestState, setting);
});

const attachApiForUser = (socket: Socket, setting: Setting) => {
  Object.keys(Sequence.map).forEach((endpoint) => {
    socket.on(endpoint, (requestState: any) => {
      if (isValidKey(endpoint, endpoints)) {
        endpoints[endpoint](socket, requestState, setting);
      }
    });
  });
};

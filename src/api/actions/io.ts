import { Server, Socket } from "socket.io";

import Sequence from "@common/Sequence";
import Actions from ".";
import Logics from "../logics";
import { isValidKey } from "@common/utils";

export default {
  setUp: async () => {
    const io: Server = await Logics.io.get();
    return io.on("connection", Actions.io.attachAPI);
  },

  attachAPI: async (ioUser: Socket) => {
    console.log("IO START", ioUser.id);
    const setting = {};
    Object.keys(Sequence.map).forEach((endpoint) => {
      ioUser.on(endpoint, (requestState: any) => {
        console.log("IO -------------- " + endpoint);
        if (isValidKey(endpoint, Actions.io)) {
          Actions.io[endpoint](ioUser, requestState, setting);
        }
      });
    });
    const { ch, hasSlash, protocol, host } = ioUser.handshake.query;
    const thread = { ch, hasSlash, protocol, host };
    const requestState = { thread, type: "tune" };
    Actions.io.tune(ioUser, requestState, setting);
  },

  tune: async (ioUser: Socket, requestState: any, setting: any) => {
    console.log("TUNE");
  },
};

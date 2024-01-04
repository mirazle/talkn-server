import { Setting } from "@server/common/models/Setting";
import TalknIo from "@server/listen";
import { Socket } from "socket.io";

export type Request = {};

export type Response = {};

export default (
  talknIo: TalknIo,
  socket: Socket,
  request: Request,
  setting: Setting
) => {
  console.log("post", request);
};

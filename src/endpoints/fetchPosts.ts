import { Setting } from "@server/common/models/Setting";
import { Socket } from "socket.io";

export type Request = {};

export type Response = {};

export default (socket: Socket, request: Request, setting: Setting) => {
  console.log("fetchPosts", request);
};

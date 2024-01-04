import ChModel from "@common/models/Ch";
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
  const { handshake } = socket;
  const host = String(handshake.headers.host);
  const tuneId = String(handshake.query.tuneId);
  const connection = String(handshake.query.connection);
  const chUserCnt = talknIo.server.engine.clientsCount;
  const childChUsers = talknIo.getChildChUsers(connection);
  const childChUserCnt = childChUsers ? childChUsers.size : 0;
  const chParams = ChModel.getChParams({
    host,
    connection,
    liveCnt: chUserCnt,
  });

  socket.leave(connection);

  console.log("untune!", chUserCnt, childChUserCnt, connection);
  talknIo.emit(socket, tuneId, { tuneCh: chParams, type: "untune" });
  talknIo.broadcast(connection, { tuneCh: chParams, type: "untune" });
};

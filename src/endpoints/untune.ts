import { Socket } from 'socket.io';
import ChModel from '@common/models/Ch';
import { Setting } from '@server/common/models/Setting';
import TalknIo from '@server/listen';

export type Request = {};

export type Response = {};

export default (talknIo: TalknIo, socket: Socket, request: Request, setting: Setting) => {
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const connection = ChModel.getConnectionFromRequest(host, url);
  console.log('@', connection, talknIo.topConnection);
  if (connection.startsWith(talknIo.topConnection)) {
    socket.leave(connection);

    const chUserCnt = talknIo.server.engine.clientsCount;
    const childChUsers = talknIo.getChildChUsers(connection);
    const childChUserCnt = childChUsers ? childChUsers.size : 0;
    const chParams = ChModel.getChParams({ tuneId, host, connection, liveCnt: chUserCnt });

    console.log('untune!', chUserCnt, childChUserCnt, connection);
    talknIo.broadcast(connection, { tuneCh: chParams, type: 'untune' });
  } else {
    console.warn('BAD CONNECTION', connection, talknIo.topConnection);
  }
};

import { Socket } from 'socket.io';
import ChModel from '@common/models/Ch';
import { Contract } from '@common/models/Contract';
import TalknIo from '@server/listens/io';

export type Request = {};

export type Response = {};

export default async (talknIo: TalknIo, socket: Socket, contract?: Contract, request?: Request) => {
  const { redisClients } = talknIo.listend;
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const connection = ChModel.getConnectionFromRequest(host, url);

  if (connection.startsWith(talknIo.topConnection)) {
    const parentConnection = ChModel.getParentConnection(connection);
    socket.join(connection);
    const rootChUserCnt = talknIo.getRootChUsers();
    const childChUsers = talknIo.getChildChUsers(connection);
    const childChUserCnt = childChUsers ? childChUsers.size : 0;
    const chParams = ChModel.getChParams({ tuneId, host, connection, liveCnt: childChUserCnt, contract });

    redisClients.liveCntRedis.zAdd(parentConnection, { value: connection, score: childChUserCnt });
    console.log('tune!', rootChUserCnt, childChUserCnt, connection);

    talknIo.broadcast(connection, { tuneCh: chParams, type: 'tune' });
  } else {
    console.warn('BAD CONNECTION', connection, 'SERVER TOP_CONNECTION', talknIo.topConnection);
  }
};

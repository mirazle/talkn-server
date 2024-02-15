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

    //    const liveRank = await redisClients.liveCntRedis.zRangeWithScores(parentConnection, 0, -1, { REV: true });
    // console.log('fetchRanks', liveRank);
    // socket.broadcast.emit(connection, { ranks: chParams, type: "fetchRanks" });
  }
};

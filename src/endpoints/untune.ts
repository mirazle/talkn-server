import { Socket } from 'socket.io';
import ChModel from '@common/models/Ch';
import { Contract } from '@common/models/Contract';
import TalknIo from '@server/listens/io';
import { TuneOption, liveMethodList } from '@common/models/TuneOption';
import logics from './logics';

export type Request = {};

export type Response = {};

export default async (talknIo: TalknIo, socket: Socket, contract?: Contract, request?: Request) => {
  const { listend, isContractConnection, topConnection } = talknIo;
  const { redisClients } = listend;
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const connection = ChModel.getConnectionFromRequest(host, url);

  if (connection.startsWith(topConnection)) {
    const parentConnection = ChModel.getParentConnection(connection);
    socket.leave(connection);

    const liveCnt = talknIo.getLiveCnt(connection);
    talknIo.publish(parentConnection, connection, liveCnt);

    console.log('@@@@@@@@ UNTUNE');
    const chParams = ChModel.getChParams({ tuneId, host, connection, liveCnt, contract });
    const { isUpdate, newLiveCnt } = await talknIo.updateRank(parentConnection, connection, liveCnt);
    talknIo.broadcast(connection, { tuneCh: chParams, type: 'untune' });

    liveMethodList.forEach((key) => {
      const methodName = key as keyof TuneOption;
      if (logics.tuneMethods[methodName]) {
        logics.tuneMethods[methodName]!(talknIo, parentConnection, connection);
      }
    });
  } else {
    console.warn('BAD CONNECTION', connection, talknIo.topConnection);
  }
};

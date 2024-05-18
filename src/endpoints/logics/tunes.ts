import { Socket } from 'socket.io';
import ChModel from '@common/models/Ch';
import ChConfigModel, { ChConfig } from '@common/models/ChConfig';
import { tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import logics from '@server/endpoints/logics';
import TalknIo from '@server/listens/io';
import { Types } from '@common/models';

export default async (isIncrement: boolean, talknIo: TalknIo, socket: Socket, chConfig: ChConfig) => {
  const method = isIncrement ? 'tune' : 'untune';
  const { topConnection } = talknIo;
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const tuneConnection = ChModel.getConnectionFromRequest(host, url);

  if (tuneConnection.startsWith(topConnection)) {
    // fix status
    const chConfigJson = talknIo.chConfigJson;
    const connections = ChModel.getConnections(tuneConnection, { isSortUpperLayer: true });
    const myRootsConnections = ChConfigModel.getRootsConnections({ chConfigJson, tuneConnection });

    const liveCnt = talknIo.getLiveCnt(socket, tuneConnection, isIncrement);
    // broardcast tune.
    const tuneCh = ChModel.getChParams({ tuneId, host, connection: tuneConnection, liveCnt, chConfig }) as Types['Ch'];
    const response = { tuneCh };
    await talknIo.broadcast(method, tuneConnection, response);

    // rank
    // 自身が保有しているrankを返す
    const rank = await talknIo.getChRank(tuneOptionRank, tuneConnection);
    await talknIo.broadcast(tuneOptionRank, tuneConnection, { rank });

    // 自分が所属するtopConnection
    // topConnectionにpublishする
    if (topConnection === tuneConnection) {
      /*
      if (ChModel.rootConnection !== tuneConnection) {
        const myChRootsConnectionCnt = myRootsConnections.length;
        const parentChRootsConnection = myRootsConnections[myChRootsConnectionCnt - 1];
        console.log('A', parentChRootsConnection, tuneConnection);
        talknIo.redis.publish(parentChRootsConnection, {
          method: tuneOptionRank,
          registConnections: [String(parentChRootsConnection)],
          valueConnection: tuneConnection,
          liveCnt,
        });
      }
      */
    } else {
      const parentConnection = ChModel.getParentConnection(tuneConnection);
      // 自分の所属するioサーバーにpublish
      talknIo.redis.publish(topConnection, {
        method: tuneOptionRank,
        registConnections: [String(parentConnection)],
        valueConnection: tuneConnection,
        liveCnt,
      });
    }

    // rankAll
    // 自身が保有しているrankAllを返す
    const rankAll = await talknIo.getChRank(tuneOptionRankAll, tuneConnection);
    await talknIo.broadcast(tuneOptionRankAll, tuneConnection, { rankAll });

    for (const i in myRootsConnections) {
      const myChRootsConnection = myRootsConnections[i];
      const _nextConnection = myRootsConnections[Number(i) + 1];
      const nextConnection = _nextConnection ? _nextConnection : tuneConnection;

      const myConnectionClass = ChModel.getMyConnectionClass(connections, myChRootsConnection, nextConnection);

      talknIo.redis.publish(myChRootsConnection, {
        method: tuneOptionRankAll,
        registConnections: myConnectionClass,
        valueConnection: tuneConnection,
        liveCnt,
      });
    }
  } else {
    console.warn('BAD CONNECTION', tuneConnection, 'SERVER TOP_CONNECTION', topConnection);
  }
};

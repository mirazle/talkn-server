import { Socket } from 'socket.io';
import ChModel, { Connection } from '@common/models/Ch';
import { ChConfig } from '@common/models/ChConfig';
import { tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import logics from '@server/endpoints/logics';
import TalknIo from '@server/listens/io';
import { Types } from '@server/common/models';
import { LightRank } from '@common/models/Rank';

export type Request = {};

export type Response = {
  type: 'tune';
  tuneCh: Types['Ch'];
  rank: Types['Rank'];
  rankAll: Types['Rank'];
};
/*
  子供をtuneしてから親をtuneすると子供のrankが生成されてない、もしくは取得できない。ここを切り分ける。
*/
// ③rankAll
export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig | null, request?: Request) => {
  const { topConnection } = talknIo;
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const connection = ChModel.getConnectionFromRequest(host, url);

  if (connection.startsWith(topConnection)) {
    // fix status
    const parentConnection = ChModel.getParentConnection(connection);
    const liveCnt = talknIo.getLiveCnt(socket, connection, true);

    // broardcast tune.
    const tuneCh = ChModel.getChParams({ tuneId, host, connection, liveCnt, chConfig }) as Types['Ch'];
    const response = { tuneCh };
    await talknIo.broadcast('tune', connection, response);

    // broardcast rankAll.
    const rankAllList = await logics.tuneMethods[tuneOptionRankAll]!(talknIo, parentConnection, connection, response);
    /*
    rankAllList.forEach((rankAllData: any) => {
      const connection = Object.keys(rankAllData)[0];
      const rankAll = rankAllData[connection];
      talknIo.broadcast(tuneOptionRankAll, connection, { rankAll });
    });

    // broardcast rank.
    const { parentBelongRank, selfBelongRank } = await logics.tuneMethods[tuneOptionRank]!(talknIo, parentConnection, connection, response);
    await talknIo.broadcast(tuneOptionRank, parentConnection, { rank: parentBelongRank });
    await talknIo.broadcast(tuneOptionRank, connection, { rank: selfBelongRank });
*/
    // update status
    await talknIo.putChRank(parentConnection, connection, liveCnt);
    await talknIo.putChRankAll(parentConnection, connection, liveCnt);
  } else {
    console.warn('BAD CONNECTION', connection, 'SERVER TOP_CONNECTION', talknIo.topConnection);
  }
};

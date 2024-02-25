import { Socket } from 'socket.io';
import ChModel from '@common/models/Ch';
import { Contract } from '@common/models/Contract';
import { tuneOptionRank } from '@common/models/TuneOption';
import logics from '@server/endpoints/logics';
import TalknIo from '@server/listens/io';
import { Types } from '@server/common/models';

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
export default async (talknIo: TalknIo, socket: Socket, contract?: Contract, request?: Request) => {
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
    const tuneCh = ChModel.getChParams({ tuneId, host, connection, liveCnt, contract }) as Types['Ch'];
    await talknIo.broadcast('tune', connection, { tuneCh });

    // broardcast rank.
    const { parentRank, selfRank } = await logics.tuneMethods[tuneOptionRank]!(talknIo, parentConnection, connection, { tuneCh });
    await talknIo.broadcast('rank', parentConnection, { rank: parentRank });
    await talknIo.broadcast('rank', connection, { rank: selfRank });

    // update status
    await talknIo.putChRank(parentConnection, connection, liveCnt);
  } else {
    console.warn('BAD CONNECTION', connection, 'SERVER TOP_CONNECTION', talknIo.topConnection);
  }
};

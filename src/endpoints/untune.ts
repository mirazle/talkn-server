import { Socket } from 'socket.io';
import ChModel from '@common/models/Ch';
import { ChConfig } from '@common/models/ChConfig';
import { tuneOptionRank } from '@common/models/TuneOption';

import TalknIo from '@server/listens/io';
import logics from '@server/endpoints/logics';
import { Types } from '@server/common/models';

export type Request = {};

export type Response = {
  type: 'untune';
  tuneCh: Types['Ch'];
  rank: Types['Rank'];
  rankAll: Types['Rank'];
};

export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig, request?: Request) => {
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
    const liveCnt = talknIo.getLiveCnt(socket, connection, false);

    // broardcast tune.
    const tuneCh = ChModel.getChParams({ tuneId, host, connection, liveCnt, chConfig }) as Types['Ch'];
    await talknIo.broadcast('untune', connection, { tuneCh });

    // broardcast rank.
    const { parentRank, selfRank } = await logics.tuneMethods[tuneOptionRank]!(talknIo, parentConnection, connection, { tuneCh });
    await talknIo.broadcast('rank', parentConnection, { rank: parentRank });
    await talknIo.broadcast('rank', connection, { rank: selfRank });

    // update status
    talknIo.putChRank(parentConnection, connection, liveCnt);
  } else {
    console.warn('BAD CONNECTION', connection, talknIo.topConnection);
  }
};

import { Socket } from 'socket.io';

import ChModel from '@common/models/Ch';
import { ChConfig } from '@common/models/ChConfig';
import TalknIo from '@server/listens/io';

export type Request = {};

export type Response = {};

export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig, request?: Request) => {
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const connection = ChModel.getConnectionFromRequest(host, url);

  if (connection.startsWith(talknIo.topConnection)) {
  }
};

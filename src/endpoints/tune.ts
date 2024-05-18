import { Socket } from 'socket.io';
import { ChConfig } from '@common/models/ChConfig';
import { Types } from '@common/models';
import tunes from '@server/endpoints/logics/tunes';
import TalknIo from '@server/listens/io';

export type Request = {};

export type Response = {
  type: 'tune';
  tuneCh: Types['Ch'];
  rank: Types['Rank'];
  rankAll: Types['Rank'];
};

export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig, request?: Request) => {
  const isIncrement = true;
  tunes(isIncrement, talknIo, socket, chConfig);
};

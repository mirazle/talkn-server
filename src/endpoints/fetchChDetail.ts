import { ChConfig } from '@common/models/ChConfig';
import TalknIo from '@server/listens/io';
import { Socket } from 'socket.io';

export type Request = {};

export type Response = {};

export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig | null, request?: Request) => {
  console.log('fetchChDetail', request);
};

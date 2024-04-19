import { Socket } from 'socket.io';
import { ChConfig } from '@common/models/ChConfig';
import TalknIo from '@server/listens/io';

export type Request = {};

export type Response = {};

export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig, request?: Request) => {
  console.log('post', request);
};

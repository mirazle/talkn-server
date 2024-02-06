import { Socket } from 'socket.io';

import { Contract } from '@common/models/Contract';
import TalknIo from '@server/listens/io';

export type Request = {};

export type Response = {};

export default (talknIo: TalknIo, socket: Socket, contract?: Contract, request?: Request) => {
  console.log('post', request);
};

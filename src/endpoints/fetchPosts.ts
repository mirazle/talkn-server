import { Contract } from '@common/models/Contract';
import TalknIo from '@server/listens/io';
import { Socket } from 'socket.io';

export type Request = {};

export type Response = {};

export default (talknIo: TalknIo, socket: Socket, contract?: Contract, request?: Request) => {
  console.log('fetchPosts', request);
};

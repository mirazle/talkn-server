import { Socket, Server } from 'socket.io';
import Sequence from '../../Sequence';
import SocketIo from '../listens/io';

export default class IoLogic {
  io: any;
  constructor(socketIo: SocketIo) {
    this.io = socketIo;
    return this;
  }

  async get() {
    return this.io.get();
  }

  async connectionServer(ioUser: Socket) {
    return this.io.emit(ioUser, Sequence.CATCH_ME_KEY, { type: Sequence.CONNECTION_SERVER_KEY });
  }
}

import { Socket } from 'socket.io';
import Sequence from '../../Sequence';

export default class Io {
  io: any;
  constructor(socketIo: any) {
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

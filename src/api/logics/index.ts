import SocketIo from '../listens/io';
import Io from './io';

const socketIo = new SocketIo();
export default {
  io: new Io(socketIo),
};

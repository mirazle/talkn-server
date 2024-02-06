import { Socket, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import Ch from '@common/models/Ch';
import { Responses } from '@server/endpoints';
import conf from '@server/conf';

import { ListensReturn } from '.';

const { serverOption } = conf;

class TalknIo {
  static namespace: string = '/';
  topConnection: string;
  server: Server;
  listend: ListensReturn;
  constructor(topConnection: string, listend: ListensReturn) {
    this.topConnection = topConnection;
    this.listend = listend;
    this.server = new Server(listend.httpsServer, serverOption);
    this.server.adapter(createAdapter(listend.redisClients.pubRedis, listend.redisClients.subRedis));
  }

  get isRoot() {
    return this.topConnection === Ch.rootConnection;
  }

  public getRootChUsers() {
    return this.server.engine.clientsCount;
  }

  public getChildChUsers(connection: string) {
    return this.server.of(TalknIo.namespace).adapter.rooms.get(connection);
  }

  async on(key: string, callback: () => void) {
    this.server.on(key, callback);
  }

  async broadcast(key: string, response: Partial<Responses>) {
    // this.rootServer.emit(key, response);
    this.server.emit(key, response);
  }

  async emit(socket: Socket, key: string, response: Partial<Responses>) {
    socket.emit(key, response);
  }
}
export default TalknIo;

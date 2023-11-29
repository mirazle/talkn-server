import https from 'https';
import { createClient } from 'redis';

import { Socket, Server as IoServer } from 'socket.io';
import { createAdapter } from 'socket.io-redis';

import conf from '../../conf';

type State = any;

class SocketIo {
  io: IoServer;
  constructor() {
    const httpsServer = https.createServer(conf.ssl);
    httpsServer.listen(conf.io.port);
    this.io = new IoServer(httpsServer, { cors: { credentials: true } });
    const pubClient = createClient({url: `redis://${conf.redis.host}:${conf.redis.port}`});
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter({ pubClient, subClient }));
  }

  async get() {
    return this.io;
  }

  async on(key: string, callback: () => void) {
    this.io.on(key, callback);
  }

  async broadcast(key: string, state: State) {
    this.io.emit(key, state);
  }

  async emit(ioUser: Socket, key: string, state: State) {
    ioUser.emit(key, state);
  }
}

export default SocketIo;

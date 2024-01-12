import https from 'https';
import net from 'net';
import { Socket, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Cluster } from 'ioredis';
import { RedisClientType, createClient } from 'redis';

import Ch from '@common/models/Ch';
import conf from '@server/conf';
import { Responses } from '@server/endpoints';

const { serverOption, ssl, io } = conf;
const httpsServer = https.createServer(ssl);
const rootRedisPort = conf.redis.root.port;
const chRedisPort = conf.redis.ch.port;

class TalknIo {
  static namespace: string = '/';
  topConnection: string;
  server: Server;
  rootPubRedis: RedisClientType;
  rootSubRedis: RedisClientType;
  db: any;
  constructor(topConnection = Ch.rootConnection, ioPort = io.root.port) {
    this.topConnection = topConnection;
    httpsServer.listen(ioPort);
    this.server = new Server(httpsServer, serverOption);

    // redis
    const rootRedisClientUrl = `redis://${TalknRedis.host}:${rootRedisPort}`;
    this.rootPubRedis = createClient({ url: rootRedisClientUrl });
    this.rootPubRedis.on('connect', () => console.log('ROOT REDIS CONNECT PUB'));
    this.rootPubRedis.on('error', TalknRedis.rootPubError);
    this.rootPubRedis.connect();

    this.rootSubRedis = this.rootPubRedis.duplicate();
    this.rootSubRedis.on('connect', () => console.log('ROOT REDIS CONNECT SUB'));
    this.rootSubRedis.on('error', TalknRedis.rootSubError);
    this.rootSubRedis.connect();

    this.server.adapter(createAdapter(this.rootPubRedis, this.rootSubRedis));
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

class TalknRedis {
  static get host() {
    return process.env.REDIS_HOST || 'localhost';
  }
  static get cluster() {
    return [{ host: TalknRedis.host, port: 6379 }];
  }

  static rootPubError(err: string) {
    console.error('Redis rootPubClient error:', err);
  }

  static rootSubError(err: string) {
    console.error('Redis rootSubClient error:', err);
  }

  static chPubError(err: string) {
    console.error('Redis chPubClient error:', err);
  }

  static chSubError(err: string) {
    console.error('Redis chSubClient error:', err);
  }
}

export default TalknIo;

export const getOpenPort = (startingPort: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const checkPort = (port: number) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => {
          resolve(port); // 空いているポートが見つかりました
        });
        server.close();
      });

      server.on('error', (err: { code: string }) => {
        if (err.code === 'EADDRINUSE') {
          checkPort(port + 1); // 次のポートをチェック
        } else {
          throw 'ERROR: BAD IO PORT.';
        }
      });
    };
    checkPort(startingPort);
  });
};

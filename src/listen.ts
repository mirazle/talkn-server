import https from "https";
import { Socket, Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Cluster } from "ioredis";
import { createClient } from "redis";

import ChModel from "@common/models/Ch";
import conf from "@server/conf";
import { Responses } from "@server/endpoints";

const httpsServer = https.createServer(conf.ssl);
httpsServer.listen(conf.io.port);

class TalknIo {
  connection: string;
  chServer: Server;
  db: any;
  constructor(connection = ChModel.rootConnection) {
    this.connection = connection;
    this.chServer = new Server(httpsServer, { cors: { credentials: true } });

    const rootRedisClientUrl = `redis://${TalknRedis.host}:${conf.redis.port}`;
    const rootPubClient = createClient({ url: rootRedisClientUrl });
    const rootSubClient = rootPubClient.duplicate();
    rootPubClient.on("error", TalknRedis.pubError);
    rootSubClient.on("error", TalknRedis.subError);

    const chRedisClientUrl = `redis://${TalknRedis.host}:${
      conf.redis.port + 1
    }`;
    const chPubClient = createClient({ url: chRedisClientUrl });
    const chSubClient = chPubClient.duplicate();
    // const chPubClient = new Cluster(TalknRedis.cluster);
    chPubClient.on("error", TalknRedis.pubError);
    chSubClient.on("error", TalknRedis.subError);

    this.chServer.adapter(createAdapter(chPubClient, chSubClient));
  }
  get isRoot() {
    return this.connection === ChModel.rootConnection;
  }

  async on(key: string, callback: () => void) {
    this.chServer.on(key, callback);
  }

  async broadcast(key: string, response: Partial<Responses>) {
    this.chServer.emit(key, response);
  }

  async emit(socket: Socket, key: string, response: Partial<Responses>) {
    socket.emit(key, response);
  }
}

class TalknRedis {
  static get host() {
    return process.env.REDIS_HOST || "localhost";
  }
  static get cluster() {
    return [{ host: TalknRedis.host, port: 6379 }];
  }

  static pubError(err: string) {
    console.error("Redis pubClient error:", err);
  }

  static subError(err: string) {
    console.error("Redis subClient error:", err);
  }
}

export default TalknIo;

import https from "https";
import { Socket, Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Cluster } from "ioredis";
import { createClient } from "redis";

import conf from "@server/conf";

type Response = any;

class TalknIo {
  server: Server;
  db: any;
  constructor() {
    const httpsServer = https.createServer(conf.ssl);
    httpsServer.listen(conf.io.port);
    this.server = new Server(httpsServer, { cors: { credentials: true } });
    const pubClient = createClient({
      url: `redis://${TalknRedis.host}:${conf.redis.port}`,
    });
    //    const pubClient = new Cluster(TalknRedis.cluster);
    const subClient = pubClient.duplicate();

    pubClient.on("error", TalknRedis.pubError);
    subClient.on("error", TalknRedis.subError);

    this.server.adapter(createAdapter(pubClient, subClient));
  }

  async get() {
    return this.server;
  }

  async on(key: string, callback: () => void) {
    this.server.on(key, callback);
  }

  async broadcast(key: string, response: Response) {
    this.server.emit(key, response);
  }

  async emit(ioUser: Socket, key: string, response: Response) {
    ioUser.emit(key, response);
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

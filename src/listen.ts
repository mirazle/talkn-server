import https from "https";
import net from "net";
import { Socket, Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Cluster } from "ioredis";
import { createClient } from "redis";

import ChModel from "@common/models/Ch";
import conf from "@server/conf";
import { Responses } from "@server/endpoints";

// conf.
const { serverOption, ssl, io } = conf;

// https.
const rootHttpsServer = https.createServer(ssl);
const chHttpsServer = https.createServer(ssl);
rootHttpsServer.listen(io.root.port);
chHttpsServer.listen(io.ch.port);

// redis
const rootRedisPort = conf.redis.root.port;
const chRedisPort = conf.redis.ch.port;

class TalknIo {
  connection: string;
  rootServer: Server;
  chServer: Server;
  db: any;
  constructor(connection = ChModel.rootConnection) {
    this.connection = connection;

    this.rootServer = new Server(rootHttpsServer, serverOption);
    const rootRedisClientUrl = `redis://${TalknRedis.host}:${rootRedisPort}`;
    const rootPubClient = createClient({ url: rootRedisClientUrl });
    const rootSubClient = rootPubClient.duplicate();
    rootPubClient.on("error", TalknRedis.rootPubError);
    rootSubClient.on("error", TalknRedis.rootSubError);
    this.rootServer.adapter(createAdapter(rootPubClient, rootSubClient));

    this.chServer = new Server(chHttpsServer, serverOption);
    const chRedisClientUrl = `redis://${TalknRedis.host}:${chRedisPort}`;
    const chPubClient = createClient({ url: chRedisClientUrl });
    const chSubClient = chPubClient.duplicate();
    // const chPubClient = new Cluster(TalknRedis.cluster);
    chPubClient.on("error", TalknRedis.chPubError);
    chSubClient.on("error", TalknRedis.chSubError);
    chPubClient.connect();
    this.chServer.adapter(createAdapter(chPubClient, chSubClient));
  }
  get isRoot() {
    return this.connection === ChModel.rootConnection;
  }

  async on(key: string, callback: () => void) {
    this.chServer.on(key, callback);
  }

  async broadcast(key: string, response: Partial<Responses>) {
    // this.rootServer.emit(key, response);
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

  static rootPubError(err: string) {
    console.error("Redis rootPubClient error:", err);
  }

  static rootSubError(err: string) {
    console.error("Redis rootSubClient error:", err);
  }

  static chPubError(err: string) {
    console.error("Redis chPubClient error:", err);
  }

  static chSubError(err: string) {
    console.error("Redis chSubClient error:", err);
  }
}

export default TalknIo;

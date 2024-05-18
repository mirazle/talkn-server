import * as Redis from 'ioredis';
import { exec, spawn } from 'child_process';
import { RedisClientType, createClient } from 'redis';

import conf from '@server/conf';
import ChConfigModel, { ChConfig, Redis as RedisConfig } from '@common/models/ChConfig';
import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import { tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import { RangeWithScore } from '@common/models/Rank';

const { serverOption, redis } = conf;
const { limit } = redis;

export type RedisMessageMethod = typeof tuneOptionRank | typeof tuneOptionRankAll;

export type RedisMessage = {
  method: RedisMessageMethod;
  registConnections: Connection[];
  valueConnection: Connection;
  liveCnt: number;
};

export type RedisScore = {
  score: number;
  value: string;
};

export type RedisClients = {
  pubRedis: RedisClientType;
  subRedis: RedisClientType;
  liveCntRedis: RedisClientType;
};

export class TalknRedis {
  private config: RedisConfig;
  private cluster: Redis.Cluster;
  private clients: RedisClients;
  private get pubClient() {
    return this.clients.pubRedis;
  }

  private get subClient() {
    return this.clients.subRedis;
  }

  private get liveCntClient() {
    return this.clients.liveCntRedis;
  }
  public get ioAdapters() {
    return {
      pub: this.clients.pubRedis,
      sub: this.clients.subRedis,
    };
  }
  constructor(chConfig: ChConfig) {
    this.config = chConfig.redis;
    this.cluster = new Redis.Cluster(this.config.cluster);

    const { host, port } = this.config.client;
    const pubRedis: RedisClientType = createClient({ url: `redis://${host}:${port}` });
    const subRedis: RedisClientType = pubRedis.duplicate();
    const liveCntRedis: RedisClientType = pubRedis.duplicate();
    this.clients = { pubRedis, subRedis, liveCntRedis };
  }
  public async connect() {
    const { client } = this.config;
    // cluster
    const promiseCluster = new Promise((resolve, reject) => {
      this.cluster.on('connect', resolve);
    });

    // pub sub & live
    await startRedisServerProccess(client.port);
    const promisePub = new Promise((resolve, reject) => {
      this.clients.pubRedis.on('connect', resolve);
      this.clients.pubRedis.connect();
    });
    const promiseSub = new Promise((resolve, reject) => {
      this.clients.subRedis.on('connect', resolve);
      this.clients.subRedis.connect();
    });
    const promiseLiveCnt = new Promise((resolve, reject) => {
      this.clients.liveCntRedis.on('connect', resolve);
      this.clients.liveCntRedis.connect();
      deleteAllSortSets(this.clients.liveCntRedis, '*');
    });

    await Promise.all([promiseCluster, promisePub, promiseSub, promiseLiveCnt]);

    return this;
  }

  public async getScores(key: string): Promise<RangeWithScore[]> {
    return await this.liveCntClient.zRangeWithScores(key, 0, limit, { REV: true });
  }

  public async putScore(key: string, value: string, score: number) {
    if (score === 0) {
      await this.liveCntClient.zRem(key, value);
    } else {
      await this.liveCntClient.zAdd(key, { value, score });
    }
  }

  public async subscribe(key: string, callback: (key: string, message: string) => void) {
    this.subClient.subscribe(key, (message) => callback(key, message));
  }

  public async publish(key: Connection, message: RedisMessage) {
    if (key) {
      this.pubClient.publish(key, JSON.stringify(message));
    }
  }
}

export default TalknRedis;

export const deleteAllSortSets = async (redisClient: RedisClientType, pattern: string): Promise<void> => {
  let cursor = 0;
  do {
    // SCAN コマンドを使用してキーを検索
    const reply = await redisClient.scan(cursor, {
      MATCH: pattern,
      //COUNT: 10000,
    });

    cursor = reply.cursor;
    const keys = reply.keys;

    // 取得したキーごとに削除操作を実行
    for (const key of keys) {
      await redisClient.del(key);
      console.log(`Deleted key: ${key}`);
    }
  } while (cursor !== 0);
};

export const getRedisCluster = async (chConfig: ChConfig): Promise<Redis.Cluster> => {
  return new Promise((resolve) => {
    const cluster = new Redis.Cluster(chConfig.redis.cluster);
    cluster.on('connect', () => {
      resolve(cluster);
    });
    cluster.on('reconnecting', () => {
      console.log('Redis Reconnecting...');
    });

    cluster.on('error', (error) => {
      console.error('Redis Error:', error);
    });
  });
};

export const getRedisClients = async (chConfig: ChConfig): Promise<RedisClients> => {
  const { host, port } = chConfig.redis.client;

  // pub sub
  await startRedisServerProccess(port);
  const pubRedis: RedisClientType = createClient({ url: `redis://${host}:${port}` });
  const subRedis: RedisClientType = pubRedis.duplicate();
  const liveCntRedis = pubRedis.duplicate();

  const promisePub = new Promise((resolve, reject) => {
    pubRedis.connect();
    pubRedis.on('connect', resolve);
  });
  const promiseSub = new Promise((resolve, reject) => {
    subRedis.connect();
    subRedis.on('connect', resolve);
  });
  const promiseLiveCnt = new Promise((resolve, reject) => {
    liveCntRedis.connect();
    liveCntRedis.on('connect', resolve);
    deleteAllSortSets(liveCntRedis, '*');
  });

  await Promise.all([promisePub, promiseSub, promiseLiveCnt]);
  return { pubRedis, subRedis, liveCntRedis };
};

export const startRedisServerProccess = (port: number) => {
  return new Promise((resolve, reject) => {
    const redisServer = spawn('redis-server', ['--port', `${port}`]);
    // redis-server ./redis.conf --port 6380 &
    redisServer.stdout.on('data', (data: string) => {
      resolve(redisServer); // Redis サーバーが起動したら resolve
    });

    redisServer.stderr.on('data', (data: string) => {
      reject(new Error(`Redis server failed to start: ${data}`)); // エラーが発生したら reject
    });

    redisServer.stderr.on('error', (error: string) => {
      reject(new Error(`Redis server error: ${error}`)); // エラーが発生したら reject
    });

    redisServer.on('close', (code: string) => {});
  });
};

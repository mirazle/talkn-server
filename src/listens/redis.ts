import * as Redis from 'ioredis';
import { exec, spawn } from 'child_process';
import { RedisClientType, createClient } from 'redis';

import conf from '@server/conf';
import { ChConfig } from '@common/models/ChConfig';
import ChModel, { Connection } from '@common/models/Ch';

const { redis } = conf;

export type RedisMessage = {
  connection: Connection;
  liveCnt: number;
};

export type RedisScore = {
  score: number;
  value: string;
};

class TalknRedis {
  static get host() {
    return process.env.REDIS_HOST || '127.0.0.1';
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

  static chLiveError(err: string) {
    console.error('Redis chSubClient error:', err);
  }
}

export default TalknRedis;

export type RedisClients = {
  pubRedis: RedisClientType;
  subRedis: RedisClientType;
  liveCntRedis: RedisClientType;
};

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
    console.log('REDIS CLUSTER', chConfig.redis.cluster);
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
  console.log('REDIS CLIENT', host, port);
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

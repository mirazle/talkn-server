import { exec, spawn } from 'child_process';
import { RedisClientType, createClient } from 'redis';
import { Cluster } from 'ioredis';

import conf from '@server/conf';
import { Contract } from '@common/models/Contract';
import ChModel from '@common/models/Ch';

const { redis } = conf;

export type RedisScore = {
  score: number;
  value: string;
};

class TalknRedis {
  static get host() {
    return process.env.REDIS_HOST || '127.0.0.1';
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
    console.log(keys);
    // 取得したキーごとに削除操作を実行
    for (const key of keys) {
      await redisClient.del(key);
      console.log(`Deleted key: ${key}`);
    }
  } while (cursor !== 0); // カーソルが '0' に戻るまで続ける
};

export const getRedisClients = async (topConnection: string, contract?: Contract): Promise<RedisClients> => {
  // pub sub
  await startRedisServerProccess(redis.root.port);
  const pubRedis: RedisClientType = createClient({ url: `redis://${TalknRedis.host}:${redis.root.port}` });
  const subRedis: RedisClientType = pubRedis.duplicate();
  let liveCntRedis: RedisClientType;

  // live cnt
  if (contract) {
    await startRedisServerProccess(contract.redis.port);
    liveCntRedis = createClient({ url: `redis://${TalknRedis.host}:${contract.redis.port}` });
  } else {
    liveCntRedis = pubRedis.duplicate();
  }

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

    redisServer.stdout.on('data', (data: string) => {
      resolve(redisServer); // Redis サーバーが起動したら resolve
    });

    redisServer.stderr.on('data', (data: string) => {
      reject(new Error(`Redis server failed to start: ${data}`)); // エラーが発生したら reject
    });

    redisServer.on('close', (code: string) => {});
  });
};

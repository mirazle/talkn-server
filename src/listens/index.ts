import * as Redis from 'ioredis';
import https from 'https';

import { Setting, init as settingInit } from '@common/models/Setting';
import { ChConfig } from '@common/models/ChConfig';
import getHttpsServer from './https';
import { RedisClients, getRedisClients, getRedisCluster } from './redis';

export type ListensReturn = {
  setting: Setting;
  httpsServer: https.Server;
  redisCluster: Redis.Cluster;
  redisClients: RedisClients;
};

const listens = async (ioPort: number, chConfig: ChConfig): Promise<ListensReturn> => {
  const setting: Setting = settingInit;
  const httpsServer = await getHttpsServer(ioPort);
  const redisClients = await getRedisClients(chConfig);
  const redisCluster = await getRedisCluster(chConfig);
  return { setting, httpsServer, redisClients, redisCluster };
};

export default listens;

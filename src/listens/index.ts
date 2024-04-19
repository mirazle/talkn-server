import * as Redis from 'ioredis';
import https from 'https';

import { Setting, init as settingInit } from '@common/models/Setting';
import { ChConfig } from '@common/models/ChConfig';
import getHttpsServer from './https';
import TalknRedis, { RedisClients, getRedisClients, getRedisCluster } from './redis';

export type ListensReturn = {
  setting: Setting;
  httpsServer: https.Server;
  redis: TalknRedis;
};

const listens = async (ioPort: number, chConfig: ChConfig): Promise<ListensReturn> => {
  const setting: Setting = settingInit;
  const httpsServer = await getHttpsServer(ioPort);
  const talknRedis = new TalknRedis(chConfig);
  const redis = await talknRedis.connect();
  return { httpsServer, redis, setting };
};

export default listens;

import https from 'https';

import { Setting, init as settingInit } from '@common/models/Setting';
import { Contract } from '@common/models/Contract';
import getHttpsServer from './https';
import { RedisClients, getRedisClients } from './redis';

export type ListensReturn = {
  setting: Setting;
  httpsServer: https.Server;
  redisClients: RedisClients;
};

const listens = async (ioPort: number, contract?: Contract): Promise<ListensReturn> => {
  const setting: Setting = settingInit;
  const httpsServer = await getHttpsServer(ioPort);
  const redisClients = await getRedisClients(contract);
  return { setting, httpsServer, redisClients };
};

export default listens;

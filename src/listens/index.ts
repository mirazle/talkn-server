import * as Redis from 'ioredis';
import https from 'https';

import { Setting, init as settingInit } from '@common/models/Setting';
import { ChConfig } from '@common/models/ChConfig';
import getHttpsServer from './https';
import TalknRedis from './redis';
import { Connection } from '@common/models/Ch';

export type ListensReturn = {
  setting: Setting;
  httpsServer: https.Server;
  redis: TalknRedis;
};

const listens = async (topConnection: Connection, myChConfig: ChConfig): Promise<ListensReturn> => {
  const setting: Setting = settingInit;
  const httpsServer = await getHttpsServer(topConnection, myChConfig);
  const talknRedis = new TalknRedis(myChConfig);
  const redis = await talknRedis.connect();
  return { httpsServer, redis, setting };
};

export default listens;

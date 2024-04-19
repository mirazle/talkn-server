import { Socket, Server } from 'socket.io';
import * as Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import { tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import { LightRank, LightRankModel, RangeWithScore } from '@common/models/Rank';

import { Responses } from '@server/endpoints';
import logics from '@server/endpoints/logics';
import { Response } from '@server/endpoints/tune';
import conf from '@server/conf';

import { ListensReturn } from '.';
import { isValidKey } from '@common/utils';
import TalknRedis, { RedisClients, RedisMessage } from './redis';
import { ChConfig } from '@common/models/ChConfig';

const { serverOption, redis } = conf;
const { limit } = redis;

export const connectionTypeRoot = 'ROOT';
export const connectionTypeContractTop = 'CONTRACT_TOP';
export const connectionTypeContract = 'CONTRACT';
export const connectionTypeUnContractTop = 'UNCONTRACT_TOP';
export const connectionTypeUnContract = 'UNCONTRACT';
export type ConnectionType =
  | typeof connectionTypeRoot
  | typeof connectionTypeContractTop
  | typeof connectionTypeContract
  | typeof connectionTypeUnContractTop
  | typeof connectionTypeUnContract;

// io、redisインスタンスを跨ぐ処理を定義
class TalknIo {
  static namespace: string = ChModel.rootConnection;
  chConfig: ChConfig;
  topConnection: string;
  server: Server;
  redis: TalknRedis;
  public get isRootServer() {
    return this.topConnection === ChModel.rootConnection;
  }
  public get topConnectionUserCnt(): number {
    return this.server.engine.clientsCount;
  }
  constructor(topConnection: string, listend: ListensReturn, chConfig: ChConfig) {
    const { httpsServer, redis } = listend;

    this.chConfig = chConfig;
    this.topConnection = topConnection;
    this.server = new Server(httpsServer, serverOption);
    this.server.adapter(createAdapter(redis.ioAdapters.pub, redis.ioAdapters.sub));
    this.redis = redis;

    this.handleOnSubscribe();
  }

  /************
   * IO
   ************/

  public getLiveCnt(socket: Socket, connection: string, isIncrement = true): number {
    isIncrement ? socket.join(connection) : socket.leave(connection);
    const connectionRoomUsers = this.server.of(TalknIo.namespace).adapter.rooms.get(connection);
    return connectionRoomUsers ? connectionRoomUsers.size : 0;
  }

  public async on(connection: string, callback: () => void) {
    this.server.on(connection, callback);
  }

  async emit(socket: Socket, connection: ParentConnection | Connection, response: Partial<Responses>) {
    if (connection) {
      socket.emit(connection, response);
    } else {
      console.warn('No Connection');
    }
  }

  async broadcast(type: string, connection: ParentConnection | Connection, response: Partial<Responses>) {
    if (connection) {
      // console.log('@@@@@@@@@ BROARDCAST', type, connection, { ...response, type });
      this.server.emit(connection, { ...response, type });
    } else {
      console.warn('No Connection');
    }
  }

  /************
   * REDIS
   ************/

  // 自分自身のconnectionでのsubscribeを受け付ける
  private async handleOnSubscribe() {
    // define
    const { chConfig } = this;
    const subscribeRankKey = `${tuneOptionRank}:${chConfig.connection}`;
    const subscribeRankAllKey = `${tuneOptionRankAll}:${chConfig.connection}`;
    const callback = async (methodKey: string, message: string) => {
      const [type, connection] = methodKey.split(':');
      const redisMessage = JSON.parse(message) as RedisMessage;
      switch (type) {
        case tuneOptionRank:
          await this.putChRank(connection, redisMessage.connection, redisMessage.liveCnt);
          break;
        case tuneOptionRankAll:
          await this.putChRankAll(redisMessage.connection, redisMessage.liveCnt);
          break;
      }
    };

    // logics
    this.redis.subscribe(subscribeRankKey, callback);
    this.redis.subscribe(subscribeRankAllKey, callback);
  }

  async getChRank(methodKey: string, connection: ParentConnection | Connection): Promise<LightRank[]> {
    let rank: LightRank[] = [];
    const scores = await this.redis.getScores(methodKey, connection);
    if (scores.length > 0) {
      rank = scores.map((score) => new LightRankModel(score) as LightRank);
    }
    return rank;
  }

  public async putChRank(parentConnection: ParentConnection, tuneConnection: Connection, liveCnt: number) {
    if (parentConnection) {
      await this.redis.putScore(`${tuneOptionRank}:${parentConnection}`, tuneConnection, liveCnt);
    }
  }

  public async putChRankAll(tuneConnection: Connection, liveCnt: number) {
    // define
    const tuneConnections = ChModel.getConnections(tuneConnection);
    const rankAllPromises: Promise<boolean>[] = [];
    const put = async (loopConnection: Connection, liveCnt: number) => {
      const parentConnection = ChModel.getParentConnection(loopConnection);
      if (parentConnection) {
        await this.redis.putScore(`${tuneOptionRankAll}:${parentConnection}`, loopConnection, liveCnt);
      }
      return true;
    };

    // logics
    tuneConnections.forEach((loopConnection) => {
      rankAllPromises.push(put(loopConnection, liveCnt));
    });
    await Promise.all(rankAllPromises);
  }
}
export default TalknIo;

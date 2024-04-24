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
import TalknRedis, { RedisClients, RedisMessage, RedisMessageMethod } from './redis';
import { ChConfig, ChConfigJson } from '@common/models/ChConfig';

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

export const rankTypeChildren = 'rank';
export const rankTypeAllChildren = 'rankAll';
export type RankType = typeof rankTypeChildren | typeof rankTypeAllChildren;

// io、redisインスタンスを跨ぐ処理を定義
class TalknIo {
  static namespace: string = ChModel.rootConnection;
  topConnection: string;
  chConfigJson: ChConfigJson;
  myChConfig: ChConfig;
  myChClassConfig: ChConfig[];
  server: Server;
  redis: TalknRedis;
  public get isRootServer() {
    return this.topConnection === ChModel.rootConnection;
  }
  public get topConnectionUserCnt(): number {
    return this.server.engine.clientsCount;
  }
  constructor(
    topConnection: string,
    chConfigJson: ChConfigJson,
    myChConfig: ChConfig,
    myChClassConfig: ChConfig[],
    listend: ListensReturn
  ) {
    const { httpsServer, redis } = listend;

    this.topConnection = topConnection;
    this.chConfigJson = chConfigJson;
    this.myChConfig = myChConfig;
    this.myChClassConfig = myChClassConfig;
    this.server = new Server(httpsServer, serverOption);
    this.server.adapter(createAdapter(redis.ioAdapters.pub, redis.ioAdapters.sub));
    this.redis = redis;

    // そもそもioサーバー
    // chConfigに存在しているが、待ち受けるhttpsサーバーが存在しないとエラーになる。
    this.handleOnSubscribe = this.handleOnSubscribe.bind(this);
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

  // 自分自身のconnectionでのみsubscribeを受け付ける
  private async handleOnSubscribe() {
    const { myChConfig } = this;
    const callback = async (connection: Connection, message: string) => {
      const redisMessage = JSON.parse(message) as RedisMessage;
      const { method } = redisMessage;
      const subscribeMethods = this.getSubscribeMethods(redisMessage);
      subscribeMethods[method](redisMessage);
    };

    // TODO: myChConfigの子供までをONする
    this.redis.subscribe(myChConfig.connection, callback);
  }

  private getSubscribeMethods(redisMessage: RedisMessage) {
    const subscribeConnection: Connection = this.myChConfig.connection;

    const getNewRank = async (rankType: RankType, connection: Connection): Promise<LightRank[]> => {
      const oldRank = await this.getChRank(rankType, subscribeConnection);
      let newRank: LightRank[] = [];

      let isExistConnection = false;
      if (oldRank.length > 0) {
        isExistConnection = Boolean(oldRank.find((or) => or.connection === connection));
      }

      if (isExistConnection) {
        newRank = oldRank.map((or) => (or.connection === connection ? { ...or, liveCnt: redisMessage.liveCnt } : or));
      }
      return newRank;
    };

    return {
      rank: async (redisMessage: RedisMessage) => {
        const { connections, liveCnt } = redisMessage;
        connections.forEach((connection) => {
          const newRank = getNewRank(tuneOptionRank, connection);
          this.putChRank(tuneOptionRank, subscribeConnection, connection, liveCnt);
          this.broadcast(tuneOptionRank, subscribeConnection, { rank: newRank });
        });
      },
      rankAll: (redisMessage: RedisMessage) => {
        const { connections, liveCnt } = redisMessage;
        connections.forEach((connection) => {
          const newRank = getNewRank(tuneOptionRankAll, connection);
          this.putChRank(tuneOptionRankAll, subscribeConnection, connection, liveCnt);
          this.broadcast(tuneOptionRankAll, subscribeConnection, { rank: newRank });
        });
      },
    };
  }

  async getChRank(rankType: RankType, parentConnection: ParentConnection): Promise<LightRank[]> {
    let rank: LightRank[] = [];
    if (parentConnection) {
      const scores = await this.redis.getScores(`${rankType}:${parentConnection}`);
      if (scores.length > 0) {
        rank = scores.map((score) => new LightRankModel(score) as LightRank);
      }
    }
    return rank;
  }

  public async putChRank(rankType: RankType, parentConnection: ParentConnection, tuneConnection: Connection, liveCnt: number) {
    if (parentConnection) {
      await this.redis.putScore(`${rankType}:${parentConnection}`, tuneConnection, liveCnt);
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

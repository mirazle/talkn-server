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

    // そもそもioサーバー、chConfigに存在しているが、待ち受けるhttpsサーバーが存在しないとエラーになる。
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
      const key = `${type}:${connection}`;
      // console.log('@ BROARDCAST', key, { ...response, type });
      this.server.emit(key, { ...response, type });
    } else {
      console.warn('No Connection', type, connection);
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

    this.redis.subscribe(myChConfig.connection, callback);
  }

  private getSubscribeMethods(redisMessage: RedisMessage) {
    const getNewRank = async (
      rankType: RankType,
      keyConnection: ParentConnection,
      valueConnection: Connection,
      liveCnt: Number
    ): Promise<LightRank[]> => {
      const oldRank = await this.getChRank(rankType, keyConnection);
      let newRank: LightRank[] = [];

      if (oldRank.length === 0) {
        return [{ connection: valueConnection, liveCnt }] as LightRank[];
      } else {
        const isFindConnection = Boolean(oldRank.find((r) => r.connection === valueConnection));
        newRank = isFindConnection
          ? oldRank.map((or) => (or.connection === valueConnection ? ({ ...or, liveCnt } as LightRank) : or))
          : ([...oldRank, { connection: valueConnection, liveCnt }] as LightRank[]);
        return newRank.sort((a, b) => b.liveCnt - a.liveCnt);
      }
    };

    return {
      rank: async (redisMessage: RedisMessage) => {
        const { registConnections, valueConnection, liveCnt } = redisMessage;
        const keyConnection = registConnections[0];
        const newRank = await getNewRank(tuneOptionRank, keyConnection, valueConnection, liveCnt);
        this.broadcast(tuneOptionRank, keyConnection, { rank: newRank });
        this.putChRank(tuneOptionRank, keyConnection, valueConnection, liveCnt);
      },
      rankAll: async (redisMessage: RedisMessage) => {
        const { registConnections, valueConnection, liveCnt } = redisMessage;

        for (const i in registConnections) {
          const keyConnection = registConnections[i];
          const newRank = await getNewRank(tuneOptionRankAll, keyConnection, valueConnection, liveCnt);
          this.broadcast(tuneOptionRankAll, keyConnection, { rankAll: newRank });
          this.putChRank(tuneOptionRankAll, keyConnection, valueConnection, liveCnt);
        }
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

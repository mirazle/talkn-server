import { Socket, Server } from 'socket.io';
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
import { RedisMessage } from './redis';
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
  topConnection: string;
  server: Server;
  listend: ListensReturn;
  chConfig: ChConfig | null;
  get isRootServer() {
    return this.topConnection === ChModel.rootConnection;
  }
  constructor(topConnection: string, listend: ListensReturn, chConfig: ChConfig | null) {
    this.topConnection = topConnection;
    this.listend = listend;
    this.chConfig = chConfig;
    this.server = new Server(listend.httpsServer, serverOption);
    this.server.adapter(createAdapter(listend.redisClients.pubRedis, listend.redisClients.subRedis));
    this.getConnectionType = this.getConnectionType.bind(this);

    this.handleOnRootSubscribe();
  }
  public getConnectionType(connection: Connection = ChModel.rootConnection): ConnectionType {
    const { isRootServer, topConnection, chConfig } = this;
    if (isRootServer && topConnection === connection) return connectionTypeRoot;

    const isContract = Boolean(chConfig);
    if (isContract) {
      return topConnection === connection ? connectionTypeContractTop : connectionTypeContract;
    } else {
      return connection.split(ChModel.rootConnection).length === 3 ? connectionTypeUnContractTop : connectionTypeUnContract;
    }
  }
  public getTopConnectionUserCnt(): number {
    return this.server.engine.clientsCount;
  }

  public getLiveCnt(socket: Socket, connection: string, isIncrement = true): number {
    isIncrement ? socket.join(connection) : socket.leave(connection);
    const connectionRoomUsers = this.server.of(TalknIo.namespace).adapter.rooms.get(connection);
    return connectionRoomUsers ? connectionRoomUsers.size : 0;
  }

  public async on(connection: string, callback: () => void) {
    this.server.on(connection, callback);
  }

  public async getRedisScores(methodKey: string, parentConnection: ParentConnection): Promise<RangeWithScore[]> {
    return new Promise(async (resolve) => {
      if (parentConnection) {
        const { liveCntRedis } = this.listend.redisClients;
        const rangeWithScores = await liveCntRedis.zRangeWithScores(`${methodKey}:${parentConnection}`, 0, limit, { REV: true });
        resolve(rangeWithScores);
      } else {
        resolve([{ score: 0, value: '' }]);
      }
    });
  }

  public async putChRank(parentConnection: ParentConnection, connection: Connection, liveCnt: number, isPublishToRoot = true) {
    const { listend, getConnectionType } = this;
    const { liveCntRedis } = listend.redisClients;
    const connections = ChModel.getConnections(connection);
    const connectionType = getConnectionType(connection);

    const put = async (methodKey: string, keyConnection: Connection, registConnection: Connection, registLiveCnt: number) => {
      const parentKeyConnection = ChModel.getParentConnection(keyConnection);
      if (parentKeyConnection) {
        if (registLiveCnt === 0) {
          await liveCntRedis.zRem(`${methodKey}:${parentKeyConnection}`, registConnection);
        } else {
          await liveCntRedis.zAdd(`${methodKey}:${parentKeyConnection}`, { value: registConnection, score: registLiveCnt });
        }
      }
      return true;
    };

    switch (connectionType) {
      case connectionTypeRoot:
        return false;
      case connectionTypeContractTop:
        if (isPublishToRoot) {
          // subscribeした後にput(更新)する
          this.publishToRoot(`${tuneOptionRank}:${connection}`, { connection, liveCnt });
        }
        return true;
      case connectionTypeContract:
      // const topConnection = ChModel.getTopConnection(connection);
      // this.publishToRoot(`${tuneOptionRankAll}:${topConnection}`, { connection: topConnection, liveCnt });
      case connectionTypeUnContractTop:
      case connectionTypeUnContract:
        /*
        let rankAllPromises: Promise<boolean>[] = [];
        connections.forEach((keyConnection) => {
          console.log('rankAll put', keyConnection);
          rankAllPromises.push(put(tuneOptionRankAll, keyConnection, connection, liveCnt));
        });
        await Promise.all(rankAllPromises);
        */
        put(tuneOptionRank, connection, connection, liveCnt);
        return true;
    }
  }

  public async putChRankAll(parentConnection: ParentConnection, connection: Connection, liveCnt: number, isPublishToRoot = true) {
    const { listend, getConnectionType } = this;
    const { liveCntRedis } = listend.redisClients;
    const connections = ChModel.getConnections(connection);
    const connectionType = getConnectionType(connection);

    const put = async (methodKey: string, keyConnection: Connection, connection: Connection, registLiveCnt: number) => {
      const registConnection = ChModel.getParentConnection(keyConnection);
      if (registConnection) {
        if (registLiveCnt === 0) {
          await liveCntRedis.zRem(`${methodKey}:${registConnection}`, connection);
        } else {
          await liveCntRedis.zAdd(`${methodKey}:${registConnection}`, { value: connection, score: registLiveCnt });
        }
      }
      return true;
    };

    switch (connectionType) {
      case connectionTypeRoot:
      case connectionTypeContractTop:
        return false;
      case connectionTypeContract:
        if (isPublishToRoot) {
          const topConnection = ChModel.getTopConnection(connection);
          this.publishToRoot(`${tuneOptionRankAll}:${topConnection}`, { connection: topConnection, liveCnt });
        }
      case connectionTypeUnContractTop:
      case connectionTypeUnContract:
        let rankAllPromises: Promise<boolean>[] = [];
        connections.forEach((keyConnection) => {
          rankAllPromises.push(put(tuneOptionRankAll, keyConnection, connection, liveCnt));

          if (isPublishToRoot) {
            if (keyConnection === ChModel.rootConnection) {
              this.publishToRoot(`${tuneOptionRankAll}:${keyConnection}`, { connection, liveCnt });
            }
          }
        });
        await Promise.all(rankAllPromises);
        return true;
    }
  }

  private async handleOnRootSubscribe() {
    const { isRootServer, chConfig, listend } = this;
    if (isRootServer) {
      const { subRedis } = listend.redisClients;
      const rankRootKey = `${tuneOptionRank}:${ChModel.rootConnection}`;
      const rankRootAllKey = `${tuneOptionRankAll}:${ChModel.rootConnection}`;

      const callback = (methodKey: string, message: string) => {
        const redisMessage = JSON.parse(message) as RedisMessage;
        this.subscribeFromCh(methodKey, redisMessage);
      };

      subRedis.subscribe(rankRootKey, (message) => callback(rankRootKey, message));
      subRedis.subscribe(rankRootAllKey, (message) => callback(rankRootAllKey, message));

      // contracts.forEach((contract: Contract) => {
      if (chConfig) {
        const topConnection = ChModel.getConnection(chConfig.nginx.location);
        const rankKey = `${tuneOptionRank}:${topConnection}`;
        const rankAllKey = `${tuneOptionRankAll}:${topConnection}`;
        subRedis.subscribe(rankKey, (message) => callback(rankKey, message));
        subRedis.subscribe(rankAllKey, (message) => callback(rankAllKey, message));
      }
      // });
    }
  }

  public async publishToRoot(methodKey: string, redisMessage: RedisMessage) {
    const { pubRedis } = this.listend.redisClients;

    // onRootSubscribeToBroacast内のsubscribeでキャッチ
    pubRedis.publish(methodKey, JSON.stringify(redisMessage));
    console.log('@@@@@@@@@ REDIS PUB(CH)', methodKey, redisMessage);
  }

  public async subscribeFromCh(methodKey: string, redisMessage: RedisMessage) {
    const [type, connection] = methodKey.split(':');

    // 契約サーバーからsubscribeした時に、契約サーバーのliveCntで上書きしてしまう。
    // マージするべき

    // そもそもpublishする契約サーバー側でもbroadcastしているので、二重でbroadcastしてない？
    switch (type) {
      case tuneOptionRank:
        await this.putChRank(methodKey, redisMessage.connection, redisMessage.liveCnt, false);
        break;
      case tuneOptionRankAll:
        await this.putChRankAll(methodKey, redisMessage.connection, redisMessage.liveCnt, false);
        break;
    }

    const rootScores = await this.getRedisScores(methodKey, ChModel.rootConnection);
    console.log('SUBSCRIBE @@@', type, methodKey, redisMessage.connection, redisMessage.liveCnt, rootScores);
    if (rootScores.length > 0) {
      const rank = rootScores.map((score) => new LightRankModel(score));

      this.broadcast(type, connection, { [type]: rank });
    }
  }

  async broadcast(type: string, connection: ParentConnection | Connection, response: Partial<Responses>) {
    if (connection) {
      console.log('@@@@@@@@@ BROARDCAST', type, connection, { ...response, type });
      this.server.emit(connection, { ...response, type });
    }
  }

  async getChRank(methodKey: string, connection: ParentConnection | Connection): Promise<LightRank[]> {
    let rank: LightRank[] = [];
    const scores = await this.getRedisScores(methodKey, connection);
    if (scores.length > 0) {
      rank = scores.map((score) => new LightRankModel(score) as LightRank);
    }
    return rank;
  }

  async emit(socket: Socket, connection: string, response: Partial<Responses>) {
    socket.emit(connection, response);
  }
}
export default TalknIo;

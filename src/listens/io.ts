import { Socket, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { Contract } from '@common/models/Contract';
import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import {
  tuneOptionRankHasPost,
  tuneOptionDetailEmotion,
  tuneOptionPosts,
  tuneOptionRank,
  tuneOptionRankAll,
} from '@common/models/TuneOption';
import { LightRank, LightRankModel, RangeWithScore } from '@common/models/Rank';

import { Responses } from '@server/endpoints';
import logics from '@server/endpoints/logics';
import { Response } from '@server/endpoints/tune';
import conf from '@server/conf';

import { ListensReturn } from '.';
import { isValidKey } from '@common/utils';

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
  contracts: Contract[];
  get isRootServer() {
    return this.topConnection === ChModel.rootConnection;
  }
  constructor(topConnection: string, listend: ListensReturn, contracts: Contract[]) {
    this.topConnection = topConnection;
    this.listend = listend;
    this.contracts = contracts;
    this.server = new Server(listend.httpsServer, serverOption);
    this.server.adapter(createAdapter(listend.redisClients.pubRedis, listend.redisClients.subRedis));
    this.getConnectionType = this.getConnectionType.bind(this);

    this.handleOnRootSubscribe();
  }
  public getConnectionType(connection: Connection = ChModel.rootConnection): ConnectionType {
    const { isRootServer, topConnection, contracts } = this;
    if (isRootServer && topConnection === connection) return connectionTypeRoot;

    const isContract = Boolean(contracts.find((contract) => contract.nginx.location === topConnection));
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

  public async putChRank(parentConnection: ParentConnection, connection: Connection, liveCnt: number) {
    const { listend, getConnectionType } = this;
    const { liveCntRedis } = listend.redisClients;
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
        // subscribeした後にput(更新)する
        this.publishToRoot(liveCnt);
        return true;
      case connectionTypeUnContractTop:
      case connectionTypeContract:
      case connectionTypeUnContract:
        const connections = ChModel.getConnections(connection);
        let rankAllPromises: Promise<boolean>[] = [];
        connections.forEach((keyConnection) => {
          rankAllPromises.push(put(tuneOptionRankAll, keyConnection, connection, liveCnt));
        });
        await Promise.all(rankAllPromises);
        put(tuneOptionRank, connection, connection, liveCnt);
        return true;
    }
  }

  private async handleOnRootSubscribe() {
    const { isRootServer, contracts, listend } = this;
    if (isRootServer) {
      const { subRedis } = listend.redisClients;
      contracts.forEach((contract: Contract) => {
        const topConnection = ChModel.getConnection(contract.nginx.location);
        subRedis.subscribe(topConnection, (score) => this.subscribeFromCh(topConnection, Number(score)));
      });
    }
  }

  public async publishToRoot(liveCnt: number) {
    const { topConnection, listend } = this;
    const { pubRedis } = listend.redisClients;

    // onRootSubscribeToBroacast内のsubscribeでキャッチ
    pubRedis.publish(topConnection, String(liveCnt));
    console.log('@@@@@@@@@ REDIS PUB(CH)', topConnection, liveCnt);
  }

  public async subscribeFromCh(topConnection: Connection, liveCnt: number) {
    await this.putChRank(ChModel.rootConnection, topConnection, liveCnt);
    const rootScores = await this.getRedisScores(tuneOptionRank, ChModel.rootConnection);

    if (rootScores.length > 0) {
      const parentRank = rootScores.map((score) => new LightRankModel(score));
      console.log('ROOT REDIS SUB BROARDCAST', topConnection, parentRank, liveCnt);
      this.broadcast(tuneOptionRank, `${tuneOptionRank}:${ChModel.rootConnection}`, { rank: parentRank });
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

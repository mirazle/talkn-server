import { Socket, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { Contract } from '@common/models/Contract';
import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import { tuneOptionRank } from '@common/models/TuneOption';
import { Responses } from '@server/endpoints';
import conf from '@server/conf';
import RankModel from '@server/common/models/Rank';

import { ListensReturn } from '.';

const { serverOption, redis } = conf;
const { limit } = redis;

// io、redisインスタンスを跨ぐ処理を定義
class TalknIo {
  static namespace: string = ChModel.rootConnection;
  topConnection: string;
  server: Server;
  listend: ListensReturn;
  contracts: Contract[];
  public get isRootConnection(): boolean {
    return this.topConnection === ChModel.rootConnection;
  }

  public get isContractConnection(): boolean {
    const { topConnection, contracts } = this;
    return Boolean(contracts.find((contract) => contract.nginx.location === topConnection));
  }
  constructor(topConnection: string, listend: ListensReturn, contracts: Contract[]) {
    this.topConnection = topConnection;
    this.listend = listend;
    this.contracts = contracts;
    this.server = new Server(listend.httpsServer, serverOption);
    this.server.adapter(createAdapter(listend.redisClients.pubRedis, listend.redisClients.subRedis));

    this.onSubscribeToBroacast();
  }

  public getTopConnectionUserCnt() {
    return this.server.engine.clientsCount;
  }

  public getLiveCnt(connection: string) {
    const connectionRoomUsers = this.server.of(TalknIo.namespace).adapter.rooms.get(connection);
    return connectionRoomUsers ? connectionRoomUsers.size : 0;
  }

  public async on(connection: string, callback: () => void) {
    this.server.on(connection, callback);
  }

  public async updateRank(
    parentConnection: ParentConnection,
    connection: Connection,
    liveCnt: number
  ): Promise<{ isUpdate: boolean; newLiveCnt: number }> {
    const { liveCntRedis } = this.listend.redisClients;
    if (parentConnection) {
      let newLiveCnt = 0;
      if (liveCnt === 0) {
        newLiveCnt = await liveCntRedis.zRem(parentConnection, connection);
      } else {
        newLiveCnt = await liveCntRedis.zAdd(parentConnection, { value: connection, score: liveCnt });
      }
      return { isUpdate: true, newLiveCnt };
    }
    return { isUpdate: false, newLiveCnt: 0 };
  }

  public async publish(parentConnection: ParentConnection, connection: Connection, connectionUserCnt: number) {
    const { isContractConnection } = this;
    const { liveCntRedis, pubRedis } = this.listend.redisClients;

    if (parentConnection) {
      let newScore = 0;
      if (connectionUserCnt === 0) {
        newScore = await liveCntRedis.zRem(parentConnection, connection);
      } else {
        newScore = await liveCntRedis.zAdd(parentConnection, { value: connection, score: connectionUserCnt });
      }

      if (isContractConnection && parentConnection === ChModel.rootConnection) {
        console.log('@@@@@@@@@ REDIS PUB', connection, connectionUserCnt);
        pubRedis.publish(connection, String(connectionUserCnt));
      }
    }
  }

  private onSubscribeToBroacast() {
    const { isRootConnection, contracts, listend } = this;
    if (isRootConnection) {
      const { subRedis, liveCntRedis } = listend.redisClients;
      contracts.forEach((contract: Contract) => {
        const connection = ChModel.getConnection(contract.nginx.location);
        subRedis.subscribe(connection, async (score: string) => {
          console.log('REDIS SUB', connection, score);
          let newScore = Number(score);
          if (newScore === 0) {
            newScore = await liveCntRedis.zRem(ChModel.rootConnection, connection);
          } else {
            newScore = await liveCntRedis.zAdd(ChModel.rootConnection, { value: connection, score: newScore });
          }

          const parentScores = await liveCntRedis.zRangeWithScores(ChModel.rootConnection, 0, 20, { REV: true });
          if (parentScores.length > 0) {
            const parentRank = RankModel.getLightRank(parentScores);
            console.log('ROOT REDIS SUB BROARDCAST', connection, score);
            this.broadcast(`rank:${ChModel.rootConnection}`, { rank: parentRank, type: 'rank' });
          }
        });
      });
    }
  }

  async broadcast(connection: string, response: Partial<Responses>) {
    this.server.emit(connection, response);
  }

  async broadcastRank(parentConnection: ParentConnection, connection: Connection) {
    const { liveCntRedis } = this.listend.redisClients;

    if (parentConnection) {
      const parentScores = await liveCntRedis.zRangeWithScores(parentConnection, 0, limit, { REV: true });
      if (parentScores.length > 0) {
        const parentRank = RankModel.getLightRank(parentScores);
        this.broadcast(`${tuneOptionRank}:${parentConnection}`, { rank: parentRank, type: 'rank' });
      }
    }

    const scores = await liveCntRedis.zRangeWithScores(connection, 0, limit, { REV: true });
    if (scores.length > 0) {
      const rank = RankModel.getLightRank(scores);
      console.log('CH REDIS SUB BROARDCAST', connection);
      this.broadcast(`${tuneOptionRank}:${connection}`, { rank, type: 'rank' });
    }
  }

  async emit(socket: Socket, connection: string, response: Partial<Responses>) {
    socket.emit(connection, response);
  }
}
export default TalknIo;

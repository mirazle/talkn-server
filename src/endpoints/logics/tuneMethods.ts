import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import { TuneOption, tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import { Response } from '@server/endpoints/tune';
import { LightRank, LightRankModel } from '@server/common/models/Rank';
import TalknIo, {
  connectionTypeContract,
  connectionTypeContractTop,
  connectionTypeRoot,
  connectionTypeUnContract,
  connectionTypeUnContractTop,
} from '@server/listens/io';

const tuneMethods: { [key in keyof TuneOption]: Function } = {
  rank: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    const { getConnectionType } = talknIo;
    const selfConnectionType = getConnectionType(connection);
    const liveCnt = response.tuneCh!.liveCnt;
    let parentBelongRank: LightRank[] = [];
    let selfBelongRank: LightRank[] = [];
    let isExistParentRank = false;
    switch (selfConnectionType) {
      case connectionTypeRoot:
        selfBelongRank = await talknIo.getChRank(tuneOptionRank, ChModel.rootConnection);
        break;
      case connectionTypeContractTop:
      case connectionTypeUnContractTop:
      case connectionTypeContract:
      case connectionTypeUnContract:
        parentBelongRank = await talknIo.getChRank(tuneOptionRank, parentConnection);
        isExistParentRank = Boolean(parentBelongRank.find((pr) => pr.connection === connection));
        if (isExistParentRank) {
          parentBelongRank = parentBelongRank.map((pr) => (pr.connection === connection ? { ...pr, liveCnt } : pr));
        } else {
          parentBelongRank = [...parentBelongRank, { connection, liveCnt }];
        }

        // 先に生成されていたchildrenのconnectionが存在した場合のために、自身のconnectionが所有するrankChildrenを返す
        selfBelongRank = await talknIo.getChRank(tuneOptionRank, connection);
        break;
    }
    return { ...response, parentBelongRank, selfBelongRank };
  },
  rankAll: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    // 契約サーバーの場合、/にrankAllが反映されていない
    const connections = ChModel.getConnections(connection);
    const rankAllPromises: Promise<{ [key in Connection]: LightRank[] }>[] = [];
    connections.forEach((keyConnection: Connection) => {
      rankAllPromises.push(
        new Promise(async (resolve) => {
          const tuneLiveCnt = response.tuneCh!.liveCnt;
          let chRank = await talknIo.getChRank(tuneOptionRankAll, keyConnection);
          let isExistConnection = false;
          if (chRank.length >= 1) {
            isExistConnection = Boolean(chRank.find((cr) => cr.connection === connection));
          }

          if (isExistConnection) {
            chRank = chRank.map((cr) => (cr.connection === connection ? { ...cr, liveCnt: tuneLiveCnt } : cr));
          } else {
            if (keyConnection !== connection) {
              chRank = [...chRank, { connection, liveCnt: tuneLiveCnt } as LightRank];
            }
          }
          resolve({ [keyConnection]: chRank });
        })
      );
    });
    return await Promise.all(rankAllPromises);
  },
  posts: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    return new Promise((resolve) => resolve(response));
  },
  rankHasPost: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    return new Promise((resolve) => resolve(response));
  },
  detailEmotion: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    return new Promise((resolve) => resolve(response));
  },
};

export default tuneMethods;

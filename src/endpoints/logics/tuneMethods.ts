import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import { TuneOption, tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import { Response } from '@server/endpoints/tune';
import { LightRank, LightRankModel } from '@server/common/models/Rank';
import TalknIo from '@server/listens/io';

const tuneMethods: { [key in keyof TuneOption]: Function } = {
  rank: async (talknIo: TalknIo, tuneConnection: Connection) => {
    /*
    let parentBelongRank: LightRank[] = [];
    let selfBelongRank: LightRank[] = [];
    let rank: LightRank[] = [];

    if (tuneConnection === ChModel.rootConnection) {
      selfBelongRank = await talknIo.getChRank(tuneOptionRank, tuneConnection);
    } else {

      parentBelongRank = await talknIo.getChRank(tuneOptionRank, parentConnection);
      const isIncludeTuneConnection = Boolean(parentBelongRank.find((pr) => pr.connection === tuneConnection));
      if (isIncludeTuneConnection) {
        parentBelongRank = parentBelongRank.map((pr) => (pr.connection === tuneConnection ? { ...pr, liveCnt } : pr));
      } else {
        parentBelongRank = [...parentBelongRank, { connection: tuneConnection, liveCnt }];
      }

      // 先に生成されていた子供のconnectionが存在した場合のために、自身のconnectionが所有するrankを返す
      selfBelongRank = await talknIo.getChRank(tuneOptionRank, tuneConnection);
    }

    return { parentBelongRank, selfBelongRank };
    */
    return await talknIo.getChRank(tuneOptionRank, tuneConnection);
  },
  rankAll: async (talknIo: TalknIo, parentConnection: ParentConnection, tuneConnection: Connection, response: Partial<Response>) => {
    // 契約サーバーの場合、/にrankAllが反映されていない
    const tuneConnections = ChModel.getConnections(tuneConnection);
    const rankAllPromises: Promise<{ [key in Connection]: LightRank[] }>[] = [];
    const tuneLiveCnt = response.tuneCh!.liveCnt;

    tuneConnections.forEach((loopConnection: Connection) => {
      rankAllPromises.push(
        new Promise(async (resolve) => {
          let chRank = await talknIo.getChRank(tuneOptionRankAll, loopConnection);
          let isIncludeTuneConnection = false;

          if (chRank.length >= 1) {
            isIncludeTuneConnection = Boolean(chRank.find((cr) => cr.connection === tuneConnection));
          }

          if (isIncludeTuneConnection) {
            chRank = chRank.map((cr) => (cr.connection === tuneConnection ? { ...cr, liveCnt: tuneLiveCnt } : cr));
          } else {
            if (loopConnection !== tuneConnection) {
              chRank = [...chRank, { connection: tuneConnection, liveCnt: tuneLiveCnt } as LightRank];
            }
          }
          resolve({ [loopConnection]: chRank });
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

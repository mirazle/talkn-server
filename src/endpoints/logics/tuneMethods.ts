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
    let parentRank: LightRank[] = [];
    let selfRank: LightRank[] = [];
    let isExistParentRank = false;
    switch (selfConnectionType) {
      case connectionTypeRoot:
        selfRank = await talknIo.getChRank(tuneOptionRank, ChModel.rootConnection);
        break;
      case connectionTypeContractTop:
      case connectionTypeUnContractTop:
      case connectionTypeContract:
      case connectionTypeUnContract:
        parentRank = await talknIo.getChRank(tuneOptionRank, parentConnection);
        isExistParentRank = Boolean(parentRank.find((pr) => pr.connection === connection));
        if (isExistParentRank) {
          parentRank = parentRank.map((pr) => (pr.connection === connection ? { ...pr, liveCnt } : pr));
        } else {
          parentRank = [...parentRank, { connection, liveCnt }];
        }

        selfRank = await talknIo.getChRank(tuneOptionRank, connection);
        break;
    }
    return { ...response, parentRank, selfRank };
  },
  rankAll: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    // rankAllに今回分のtune(最新値を反映させる)
    const connections = ChModel.getConnections(connection);
    const rankAllPromises: Promise<{ [key in Connection]: LightRank[] }>[] = [];
    console.log('@@@ rankAll', connections);
    connections.forEach((keyConnection: Connection) => {
      console.log('- ', keyConnection);
      rankAllPromises.push(
        new Promise(async (resolve) => {
          const liveCnt = response.tuneCh!.liveCnt;
          let chRank = await talknIo.getChRank(tuneOptionRankAll, keyConnection);
          let isExistRank = false;
          if (chRank.length >= 1) {
            isExistRank = Boolean(chRank.find((cr) => cr.connection === connection));
            console.log('A', isExistRank);
          }

          if (isExistRank) {
            console.log('B');
            chRank = chRank.map((cr) => (cr.connection === connection ? { ...cr, liveCnt } : cr));
          } else {
            if (keyConnection !== connection) {
              chRank = [...chRank, { connection, liveCnt } as LightRank];
              console.log('C');
            } else {
              console.log('D');
            }
          }

          console.log(isExistRank, chRank.length, keyConnection, connection, chRank);

          //chRank = isExistRank ? chRank : [...chRank, { connection, liveCnt }];
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

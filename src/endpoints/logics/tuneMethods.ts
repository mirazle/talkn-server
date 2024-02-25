import { Connection, ParentConnection } from '@common/models/Ch';
import { TuneOption } from '@common/models/TuneOption';
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
        return response;
      case connectionTypeContractTop:
      case connectionTypeUnContractTop:
      case connectionTypeContract:
      case connectionTypeUnContract:
        parentRank = await talknIo.getChRank(parentConnection);
        isExistParentRank = Boolean(parentRank.find((pr) => pr.connection === connection));
        if (isExistParentRank) {
          parentRank = parentRank.map((pr) => (pr.connection === connection ? { ...pr, liveCnt } : pr));
        } else {
          parentRank = [...parentRank, { connection, liveCnt }];
        }

        selfRank = await talknIo.getChRank(connection);
        return { ...response, parentRank, selfRank };
    }
  },
  rankAll: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection, response: Partial<Response>) => {
    return new Promise((resolve) => resolve(response));
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

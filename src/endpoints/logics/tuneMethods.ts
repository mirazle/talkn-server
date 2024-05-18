import { Connection, ParentConnection } from '@common/models/Ch';
import { TuneOption, tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';

import { Response } from '@server/endpoints/tune';
import TalknIo from '@server/listens/io';

const tuneMethods: { [key in keyof TuneOption]: Function } = {

  rank: async (talknIo: TalknIo, tuneConnection: Connection) => {
    return await talknIo.getChRank(tuneOptionRank, tuneConnection);
  },
  rankAll: async (talknIo: TalknIo, tuneConnection: Connection) => {
    return await talknIo.getChRank(tuneOptionRankAll, tuneConnection);
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

import { Connection, ParentConnection } from '@common/models/Ch';
import { TuneOption, tuneOptionPosts, tuneOptionDetailEmotion, tuneOptionRankHasPost } from '@common/models/TuneOption';
import TalknIo from '@server/listens/io';

const tuneMethods: { [key in keyof TuneOption]: Function } = {
  rank: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection) => {
    talknIo.broadcastRank(parentConnection, connection);
  },
  rankAll: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection) => {
    talknIo.broadcastRank(parentConnection, connection);
  },
  posts: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection) => {
    talknIo.broadcast(`${tuneOptionPosts}:${connection}`, { posts: [], type: 'posts' });
  },
  rankHasPost: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection) => {
    talknIo.broadcast(`${tuneOptionRankHasPost}:${connection}`, { rank: [], type: 'rankHasPost' });
  },
  detailEmotion: async (talknIo: TalknIo, parentConnection: ParentConnection, connection: Connection) => {
    talknIo.broadcast(`${tuneOptionDetailEmotion}:${connection}`, { detailEmotion: {}, type: 'detailEmotion' });
  },
};

export default tuneMethods;

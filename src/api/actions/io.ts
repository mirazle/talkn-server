
import { Server as IoServer } from 'socket.io';

import Actions from '.';
import Logics from '../logics';

export default {
  setUp: async () => {
    const io: IoServer = await Logics.io.get();
    return io.on('connection', Actions.io.attachAPI);
  },

  attachAPI: async () => {
    console.log('atatch API')
  },
};

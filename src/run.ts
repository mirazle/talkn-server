import Actions from './api/actions'

/**************************************/
/* talknServer
/* soclet.io-server & redis-server
/**************************************/
// import Actions from './actions';

class TalknServer {
  async start() {
    await Actions.io.setUp();
  }
}

const talknServer = new TalknServer();
talknServer.start();

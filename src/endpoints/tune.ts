import { Socket } from 'socket.io';
import ChModel, { Connection, ParentConnection } from '@common/models/Ch';
import ChConfigModel, { ChConfig } from '@common/models/ChConfig';
import { tuneOptionRank, tuneOptionRankAll } from '@common/models/TuneOption';
import logics from '@server/endpoints/logics';
import TalknIo, { RankType } from '@server/listens/io';
import { Types } from '@server/common/models';
import { LightRank } from '@common/models/Rank';

export type Request = {};

export type Response = {
  type: 'tune';
  tuneCh: Types['Ch'];
  rank: Types['Rank'];
  rankAll: Types['Rank'];
};
/*
  子供をtuneしてから親をtuneすると子供のrankが生成されてない、もしくは取得できない。ここを切り分ける。
*/
// ③rankAll
export default async (talknIo: TalknIo, socket: Socket, chConfig: ChConfig, request?: Request) => {
  const { topConnection } = talknIo;
  const { query } = socket.handshake;
  const { headers } = socket.request;
  const host = String(headers.host);
  const url = String(socket.request.url);
  const tuneId = String(query.tuneId);
  const tuneConnection = ChModel.getConnectionFromRequest(host, url);

  if (tuneConnection.startsWith(topConnection)) {
    // fix status
    const chConfigJson = talknIo.chConfigJson;
    const myChRootsConnections = ChConfigModel.getMyChRootsConnections({ chConfigJson, tuneConnection });
    const connections = ChModel.getConnections(tuneConnection, { isReverse: true, isSelfExclude: true });
    const myConnectionClass = ChModel.getMyConnectionClass(topConnection, connections);
    const parentConnection = ChModel.getParentConnection(tuneConnection);
    const liveCnt = talknIo.getLiveCnt(socket, tuneConnection, true);

    console.log('IN', myChRootsConnections);

    // broardcast tune.
    const tuneCh = ChModel.getChParams({ tuneId, host, connection: tuneConnection, liveCnt, chConfig }) as Types['Ch'];
    const response = { tuneCh };
    await talknIo.broadcast('tune', tuneConnection, response);

    // rank(publish)
    // chの所有物
    //    自身のliveCnt -> broardcast
    //    自身が所有するランキング(子供chのランキング) -> broardcast
    //    親chに自身のliveCntを通知 -> publish(publishConnection, {method, rankType, connection, liveCnt})
    //
    //      subscribe(publishConnection, {method, rankType, connection, liveCnt})
    //        subscribes[method](tuneConnection, {publishConnection, method: rankType, connection, liveCnt})
    //
    //          const oldRank = talknIo.getChRank(rankType, tuneConnection);
    //          const rank = liveCntを反映
    //          talknIo.broardcast(rankType, tuneConnection, rank);
    //
    //          talknIo.putChRank(rankType, parentConnection, childConnection, liveCnt);
    //      }
    //
    //
    // 自分が所有するランキングを返す
    // 自分の親が所有するランキングを返すようにpublishする
    // 更新責任は親ch

    // rank
    const rank = await logics.tuneMethods[tuneOptionRank]!(talknIo, parentConnection, tuneConnection, response);
    await talknIo.broadcast(tuneOptionRank, tuneConnection, { rank });

    // 自分が所属するtopConnection
    // topConnectionにpublishする
    if (topConnection !== tuneConnection) {
      talknIo.redis.publish(topConnection, { method: tuneOptionRank, connections: myConnectionClass, liveCnt });
    }

    /*
      /aa.com/11/22/33/44/で接続した場合
          [liveCnt]
          ioがroomsの接続数を保持(例: 32)
          io.broardcastでクライアントにconnectionに対して接続数を返す

          [rank]
          // const put = (tuneConnection) => {
            const parentConnection = chModel.getParentConnection(tuneConnection)
            const rankAllOld = redis.getRankAll(`rankAll:${parentConnection}`)
            const rankAllNew = redis.putRankAll(`rankAll:${parentConnection}`)
            io.Broardcast() // 変更があったchのみbroardcast(liveCntと同じ構造)
          }

          put(tuneConnection)
          publishToParentConnections(parentConnection)

          [rankAll] 

          subscribe('rankAll') //  子供chからの更新&broardcast要請も、自chの更新&brardcastも全てsubscribeしてから実行する
          
          // const put = (tuneConnection) => {
            const parentConnection = chModel.getParentConnection(tuneConnection)
            const rankAllOld = redis.getRankAll(`rankAll:${parentConnection}`)
            const rankAllNew = redis.putRankAll(`rankAll:${parentConnection}`)
            io.Broardcast() // 変更があったchのみbroardcast(liveCntと同じ構造)
          }

          // 自分自身
          put(tuneConnection)
        
          // 親
          tuneParentConnections.forEach( (tuneParentConnection) => {
            全部回す
            chConfigを持っているchまでループを回す。それまでは自身のioサーバーでrankAllを持つ

            if(isConfigCh(tuneParentConnection)){
              // subscribeした先でput()して、また親connectionsのループを回す
              publishToParentConnections(tuneParentConnection) 
              break;
            } else {
              put(tuneParentConnection)
            }
          }







        io.broardcastでクライアントにconnectionsに対して接続数を返す

        ioサーバー
          Server:broardcast('tune:/aa.com/11/22/', 32)

          Server:broardcast('rank:/aa.com/11/', 32)

          Server:broardcast('rankAll:/', 32)
          Server:broardcast('rankAll:/aa.com/', 32)
          Server:broardcast('rankAll:/aa.com/11/', 32)
          Server:broardcast('rankAll:/aa.com/11/22/', 32)
        ioクライアント
          Client:on('tune:/aa.com/11/22/', callback)

          Client:on('rank:/aa.com/11/22/', callback)
          Client:on('rankAll:/aa.com/11/22/', callback)

          Client:on('disconnect', callback)

        クライアント側での問題：保持するrank数が無限になってしまう。
          レスポンスは受け付けるが、rank保持の上限数を超えた場合はクライアント側で保持しない
          rankAllの場合、子供が10000connectionあったらそれを全部受けるの？
              自分のliveCntが所属するランキングの上限数20位のliveCnt以下はクライアントに返さないようにする
              サーバー側はただchのroomsのlive数をクライアントにbroardcastするだけ。
              クライアント側はio.on(ch)してレスポンスを受けて、live数を受け取り、sortでランキングを生成して保持する。
              クライアント側で上限数20位内のchが入れ替わったら(20位圏外から20位以内に入りランキングが入れ替わった場合)、ioサーバーにリクエストで知らせる

                Client:Request:rankRangeLimitLiveCnt: {ch: '/aa.com/11/22/', rankRangeLimitLiveCnt: 127}
                  これは'/aa.com/11/22/'に所属する20位のliveCntが127であると通知
                  127以下のServer:broardcastを停止するのは、親である'/aa.com/11/'が実行する
                    Server:broardcast('rankAll:/aa.com/11/', 230)
                  
                Server:broardcast('rankRangeLimitLiveCnt:/aa.com/11/22/', 32)

          ioサーバーは自身のchのlive数をbroardcastするが、自身のchに所属するランクのbroardcast制御を入れるべきなのは子供のch。
          だから127を通知するのは所属する子供のch。/aa.com/11/22/*

          クライアント側では親のconnectionもonしておく。

            tuneChは自身のliveCntと、自分のrnakが所属する親chに
    */

    /*
                // broardcast rankAll.
    if (chConfig.accept.rankAll) {
      const rankAllList = await logics.tuneMethods[tuneOptionRankAll]!(talknIo, parentConnection, tuneConnection, liveCnt);
      rankAllList.forEach((rankAllData: any) => {
        const connection = Object.keys(rankAllData)[0];
        const rankAll = rankAllData[connection];
        talknIo.broadcast(tuneOptionRankAll, connection, { rankAll });
      });
    }

    // broardcast rank.
    const { parentBelongRank, selfBelongRank } = await logics.tuneMethods[tuneOptionRank]!(
      talknIo,
      parentConnection,
      tuneConnection,
      response
    );
    await talknIo.broadcast(tuneOptionRank, parentConnection, { rank: parentBelongRank });
    await talknIo.broadcast(tuneOptionRank, tuneConnection, { rank: selfBelongRank });

    // update status
    await talknIo.putChRank(parentConnection, tuneConnection, liveCnt);
    await talknIo.putChRankAll(tuneConnection, liveCnt);
*/
  } else {
    console.warn('BAD CONNECTION', tuneConnection, 'SERVER TOP_CONNECTION', topConnection);
  }
};

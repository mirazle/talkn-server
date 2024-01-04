import { Socket } from "socket.io";
import Sequence from "@common/Sequence";
import ChModel, { Ch } from "@common/models/Ch";
import { Setting } from "@server/common/models/Setting";
import TalknIo from "@server/listen";

export type Request = {};

export type Response = {};

export default (
  talknIo: TalknIo,
  socket: Socket,
  request: Request,
  setting: Setting
) => {
  const {
    handshake: { headers, query },
  } = socket;

  const host = String(headers.host);
  const tuneId = String(query.tuneId);
  const connection = String(query.connection);
  socket.join(connection);

  const rootChUserCnt = talknIo.getRootChUsers();
  const childChUsers = talknIo.getChildChUsers(connection);
  const childChUserCnt = childChUsers ? childChUsers.size : 0;
  const chParams = ChModel.getChParams({
    host,
    connection,
    liveCnt: rootChUserCnt,
  });

  chParams.connections!.forEach((connection) => socket.join(connection));
  console.log("tune!", rootChUserCnt, childChUserCnt, connection);
  // talknIo.emit(socket, tuneId, { tuneCh: chParams, type: "tune" });
  talknIo.broadcast(connection, { tuneCh: chParams, type: "tune" });
  // socket.emit(connection, { tuneCh: chParams, type: "tune" });

  // socket.broadcast.emit(connection, { tuneCh: chParams, type: "tune" });
  /*
    OK  ブラウザ複数立ち上げて、emitとbroardcastを確立させる。
    OK  フロントで検証 親子liveCnt解決
        Nodeサーバーを複数立ち上げて、publishとsubscribeを確認する

    /を登録chとする
      isRootChはtrue
        subscribe('/')
      connectionは/
        emitは自分にのみ
        broadcast(tune, untuneの更新)はrootRedisにpublishをかます。
      connectionは/aa
        emitは自分にのみ
        broadcast(tune, untuneの更新)はrootRedisにpublishをかます。

    /aa.comを登録chとする


    /aa.com/
    /aa.com/a/
    /aa.com/a/aa/
    /aa.com/a/aa/aaaa/
      rooms(['/aa.com/', '/aa.com/a/', '/aa.com/a/aa/','/aa.com/a/aa/aaaa/'])

      親子liveCnt解決
      tune
      untune
      fetchRank

    (isTopCh: true)

        (isTopCh: false)
          connectionは/aa.com
            emitは自分にのみ
            broadcast(tune, untuneの更新)はrootRedisにpublishをかます。
          connectionは/aa.com/aaa
            emitは自分にのみ
            broadcast(tune, untuneの更新)はrootRedisにpublishをかます。

  */
};

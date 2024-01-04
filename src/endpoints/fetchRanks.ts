import { Setting } from "@server/common/models/Setting";
import TalknIo from "@server/listen";
import { Socket } from "socket.io";

export type Request = {};

export type Response = {};

export default (
  talknIo: TalknIo,
  socket: Socket,
  request: Request,
  setting: Setting
) => {
  console.log("fetchRanks", request);
  /*
  const namespace = io.of('/your-namespace'); // あるいは io.of('/') など
const roomsInfo = [];

namespace.adapter.rooms.forEach((value, key) => {
    // key はルーム名、value は Set オブジェクトで、接続しているソケットの ID が含まれる
    roomsInfo.push({ room: key, count: value.size });
});

// 接続数が多い順にルームをソート
roomsInfo.sort((a, b) => b.count - a.count);

console.log(roomsInfo); // ソートされたルームの情報
*/
};

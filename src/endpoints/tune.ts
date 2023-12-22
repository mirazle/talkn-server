import { Socket } from "socket.io";
import Sequence from "@common/Sequence";
import ChModel, { Ch } from "@common/models/Ch";
import { Setting } from "@server/common/models/Setting";

export type Request = {};

export type Response = {};

export default (socket: Socket, request: Request, setting: Setting) => {
  const { handshake } = socket;
  const host = String(handshake.headers.host);
  const connection = String(handshake.query.connection);
  const chParams = getChParams({ host, connection });
  console.log("tune", connection, chParams);
  socket.emit(connection, { tuneCh: chParams, type: "tune" });
  // socket.broadcast.emit(connection, { tuneCh: chParams, type: "tune" });
};

type GetChPropsParams = {
  host: string;
  connection: string;
};

export const getChParams = (params: GetChPropsParams): Partial<Ch> => {
  const getConnection = (connection: string) => {
    if (connection === "") return ChModel.rootConnection;
    return connection.endsWith(ChModel.rootConnection)
      ? connection
      : `${connection}${ChModel.rootConnection}`;
  };
  const getFavicon = (host: string) => {
    return host.endsWith(ChModel.rootConnection)
      ? `${host}favicon.ico`
      : `${host}${ChModel.rootConnection}favicon.ico`;
  };
  const getConnections = (connection: string) => {
    let connections = [ChModel.rootConnection];
    if (connection !== ChModel.rootConnection) {
      const connectionArr = connection
        .split(ChModel.connectionSeparator)
        .filter((part) => part !== "");
      let connectionPart = "";
      for (const part of connectionArr) {
        connectionPart += ChModel.rootConnection + part;
        connections.push(connectionPart);
      }
    }
    return connections;
  };

  const getType = (host: string) => {
    return host.startsWith(Sequence.HTTPS_PROTOCOL) ||
      host.startsWith(Sequence.HTTP_PROTOCOL)
      ? ChModel.defultType
      : ChModel.plainType;
  };

  const { connection: _connection, host } = params;
  const connection = getConnection(_connection);
  const connections = getConnections(connection);
  const favicon = getFavicon(host);
  const type = getType(host);
  return {
    connection,
    connections,
    favicon,
    type,
  };
};

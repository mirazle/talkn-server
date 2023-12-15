import Sequence from "@common/Sequence";
import ChModel from "@common/models/Ch";
import { Setting } from "@server/common/models/Setting";
import { Socket } from "socket.io";

export type RequestState = {
  host: string;
  connection: string;
};

export default (
  ioUser: Socket,
  requestState: RequestState,
  setting: Setting
) => {
  const chProps = getChPropsFromRequest(requestState);
  console.log(chProps);
};

export const getChPropsFromRequest = (requestState: RequestState) => {
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

  const { connection: _connection, host } = requestState;
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

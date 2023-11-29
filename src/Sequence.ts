import Schema from './Schema'

export default class Sequence {
  static get TALKN_PROTOCOL() {
    return 'talkn:';
  }
  static get HTTP_PROTOCOL() {
    return 'http:';
  }
  static get HTTPS_PROTOCOL() {
    return 'https:';
  }
  static get UNKNOWN_PROTOCOL() {
    return '????:';
  }
  static get CATCH_ME_KEY() {
    return '@CATCH_ME';
  }
  static get API_SEPARATE_IO_TYPE_START() {
    return '[';
  }
  static get API_SEPARATE_IO_TYPE_END() {
    return ']';
  }
  static get API_REQUEST_TYPE() {
    return 'REQUEST';
  }
  static get API_RESPONSE_TYPE_EMIT() {
    return 'EMIT';
  }
  static get API_RESPONSE_TYPE_BROADCAST() {
    return 'BROADCAST';
  }
  static get API_SETUP() {
    return 'API_SETUP';
  }
  static get UNKNOWN() {
    return 'UNKNOWN';
  }
  static get CONNECTION_SERVER_KEY() {
    return 'CONNECTION_SERVER';
  }
  static get API_TO_SERVER_REQUEST() {
    return `API_TO_SERVER[${Sequence.API_REQUEST_TYPE}]${Sequence.METHOD_COLON}`;
  }
  static get SERVER_TO_API_EMIT() {
    return `SERVER_TO_API[${Sequence.API_RESPONSE_TYPE_EMIT}]${Sequence.METHOD_COLON}`;
  }
  static get SERVER_TO_API_BROADCAST() {
    return `SERVER_TO_API[${Sequence.API_RESPONSE_TYPE_BROADCAST}]${Sequence.METHOD_COLON}`;
  }
  static get API_TO_CLIENT_REQUEST() {
    return `API_TO_CLIENT[${Sequence.API_REQUEST_TYPE}]${Sequence.METHOD_COLON}`;
  }
  static get API_TO_CLIENT_EMIT() {
    return `API_TO_CLIENT[${Sequence.API_RESPONSE_TYPE_EMIT}]${Sequence.METHOD_COLON}`;
  }
  static get API_TO_CLIENT_BROADCAST() {
    return `API_TO_CLIENT[${Sequence.API_RESPONSE_TYPE_BROADCAST}]${Sequence.METHOD_COLON}`;
  }
  static get API_BROADCAST_CALLBACK() {
    return 'tune';
  }
  static get REDUX_ACTION_KEY() {
    return 'type';
  }
  static get METHOD_COLON() {
    return ':';
  }
  static get ADD_CLIENT_ACTION_PREFIX() {
    return 'API_TO_CLIENT';
  }
  static get map() {
    return {
      tune: {
        requestPublicState: {},
        requestPrivateState: {
          thread: ['ch', 'hasSlash', 'protocol'],
          app: ['multistream', 'rootCh', 'dispThreadType', 'actioned', 'offsetFindId', 'isToggleMultistream'],
        },
        responseEmitState: { user: ['uid'], setting: '*', thread: '*' },
        responseBroadcastState: { thread: ['liveCnt', 'ch'] },
      },
      fetchPosts: {
        requestPublicState: {},
        requestPrivateState: {
          thread: ['ch', 'protocol', 'host', 'hasSlash'],
          app: ['multistream', 'rootCh', 'dispThreadType', 'actioned', 'offsetFindId', 'isToggleMultistream'],
        },
        responseEmitState: { posts: '*', thread: '*' },
        responseBroadcastState: {},
      },
      getMore: {
        requestPublicState: {},
        requestPrivateState: {
          thread: ['ch'],
          app: ['multistream', 'dispThreadType', 'offsetFindId'],
        },
        responseEmitState: {
          app: ['dispThreadType', 'offsetFindId'],
          posts: '*',
        },
        responseBroadcastState: {},
      },
      updateThread: {
        requestPublicState: {},
        requestPrivateState: {
          thread: ['ch', 'protocol', 'host', 'hasSlash'],
        },
        responseEmitState: {
          thread: '*',
        },
        responseBroadcastState: {},
      },
      changeThread: {
        requestPublicState: {},
        requestPrivateState: {
          thread: ['ch', 'hasSlash', 'protocol'],
          app: ['tunedCh', 'multistream', 'rootCh', 'dispThreadType', 'actioned', 'offsetFindId', 'isToggleMultistream'],
        },
        responseEmitState: { thread: '*' },
        responseBroadcastState: { thread: ['liveCnt', 'ch'] },
      },
      changeThreadDetail: {
        requestPublicState: {},
        requestPrivateState: { thread: ['ch'] },
        responseEmitState: { thread: '*' },
        responseBroadcastState: {},
      },
      addFindChild: {
        requestPublicState: {},
        requestPrivateState: { thread: ['ch'] },
        responseEmitState: { thread: '*' },
        responseBroadcastState: {},
      },
      rank: {
        requestPublicState: {},
        requestPrivateState: {
          app: ['findType', 'rootCh', 'isRankDetailMode'],
        },
        responseEmitState: { rank: '*' },
        responseBroadcastState: {},
      },
      post: {
        requestPublicState: {},
        requestPrivateState: {
          user: ['uid', 'utype'],
          app: ['inputPost', 'inputStampId', 'inputCurrentTime', 'dispThreadType'],
          thread: ['findType', 'title', 'protocol', 'ch', 'chs', 'emotions', 'favicon', 'contentType'],
        },
        responseEmitState: {},
        responseBroadcastState: { posts: '*', thread: ['ch', 'emotions', 'postCnt'], user: ['uid'] },
      },
      updateThreadServerMetas: {
        requestPublicState: { thread: ['serverMetas'] },
        requestPrivateState: {
          thread: ['host', 'protocol', 'ch'],
          user: ['uid'], // 懸念 .forEachされないので一旦この形に修正
        },
        responseEmitState: { thread: '*' },
        responseBroadcastState: {},
      },
      disconnect: {
        requestPublicState: {},
        requestPrivateState: {},
        responseEmitState: {},
        responseBroadcastState: { thread: ['liveCnt', 'ch'] },
      },
    };
  }

  static getSequenceActionMap(method: string): { sequence: string; actionType: string; actionName: string } {
    const splited = method.split(Sequence.METHOD_COLON);
    if (splited && splited[0]) {
      const sequence = String(splited[0].split('[')[0]);
      let actionType;

      if (splited[0].indexOf(`[${Sequence.API_REQUEST_TYPE}]`) > 0) {
        actionType = Sequence.API_REQUEST_TYPE;
      } else {
        actionType =
          splited[0].indexOf(`[${Sequence.API_RESPONSE_TYPE_EMIT}]`) > 0
            ? Sequence.API_RESPONSE_TYPE_EMIT
            : Sequence.API_RESPONSE_TYPE_BROADCAST;
      }

      const actionName = String(splited[1]);
      return { sequence, actionType, actionName };
    } else {
      throw 'Error: Sequence getSequenceActionMap';
    }
  }

  static updateCallbackExeConditionMap(actionName: string): { emit: boolean; broadcast: boolean } {
    let activeResponseMap = { emit: true, broadcast: true };
    const sequenceMap = Sequence.map as any;
    if (sequenceMap[actionName]) {
      activeResponseMap.emit = !(Object.keys(sequenceMap[actionName].responseEmitState).length > 0);
      activeResponseMap.broadcast = !(Object.keys(sequenceMap[actionName].responseBroadcastState).length > 0);
    }
    return activeResponseMap;
  }

  static convertServerToApiIoType(iFrameId: string, actionType: string) {
    if (actionType.indexOf(`${Sequence.API_SEPARATE_IO_TYPE_START}${Sequence.API_REQUEST_TYPE}${Sequence.API_SEPARATE_IO_TYPE_END}`) >= 0) {
      return Sequence.API_REQUEST_TYPE;
    }
    if (
      actionType.indexOf(
        `${Sequence.API_SEPARATE_IO_TYPE_START}${Sequence.API_RESPONSE_TYPE_BROADCAST}${Sequence.API_SEPARATE_IO_TYPE_END}`
      ) >= 0
    ) {
      return Sequence.API_RESPONSE_TYPE_BROADCAST;
    }
    if (
      actionType.indexOf(`${Sequence.API_SEPARATE_IO_TYPE_START}${Sequence.API_RESPONSE_TYPE_EMIT}${Sequence.API_SEPARATE_IO_TYPE_END}`) >=
      0
    ) {
      return Sequence.API_RESPONSE_TYPE_EMIT;
    }
    return Sequence.API_SETUP;
  }

  static convertExtToClientActionType(iFrameId: string, actionType: string) {
    actionType = Sequence.convertApiToClientActionType(actionType);
    return actionType;
  }

  static convertApiToClientActionType(actionType: string) {
    if (actionType.indexOf(Sequence.API_TO_SERVER_REQUEST) === 0) {
      return actionType.replace(Sequence.API_TO_SERVER_REQUEST, Sequence.API_TO_CLIENT_REQUEST);
    }
    if (actionType.indexOf(Sequence.SERVER_TO_API_EMIT) === 0) {
      return actionType.replace(Sequence.SERVER_TO_API_EMIT, Sequence.API_TO_CLIENT_EMIT);
    }
    if (actionType.indexOf(Sequence.SERVER_TO_API_BROADCAST) === 0) {
      return actionType.replace(Sequence.SERVER_TO_API_BROADCAST, Sequence.API_TO_CLIENT_BROADCAST);
    }
    return actionType;
  }

  static getRequestState(actionName: string, reduxState: any, requestParams: any) {
    const endpointKey = actionName.replace(Sequence.API_TO_SERVER_REQUEST, '');
    const sequenceMap = Sequence.map as any;
    const { requestPublicState, requestPrivateState } = sequenceMap[endpointKey];
    let requestState: { [key in string]: any } = { [Sequence.REDUX_ACTION_KEY]: endpointKey };

    Object.keys(requestPrivateState).forEach((stateKey) => {
      if (!requestState[stateKey]) requestState[stateKey] = {};
      requestPrivateState[stateKey].forEach((columnName: string) => {
        if (!requestState[stateKey][columnName]) {
          let value = reduxState[stateKey][columnName];
          if (requestParams && requestParams[stateKey] && Schema.isSet(requestParams[stateKey][columnName])) {
            value = requestParams[stateKey][columnName];
          }
          requestState[stateKey][columnName] = value;
        }
      });
    });

    Object.keys(requestPublicState).forEach((stateKey) => {
      if (!requestState[stateKey]) requestState[stateKey] = {};

      requestPublicState[stateKey].forEach((columnName: string) => {
        if (!requestState[stateKey][columnName]) {
          requestState[stateKey][columnName] = requestParams;
        }
      });
    });
    return requestState;
  }

  static getResponseState(responseType: string, requestState: any, updateState: any) {
    const endpointKey = requestState.type;
    const sequenceMap = Sequence.map as any;
    const responseSchema = sequenceMap[endpointKey][`response${responseType}State`];
    let responseState = { [Sequence.REDUX_ACTION_KEY]: endpointKey };
    Object.keys(responseSchema).forEach((updateStateKey) => {
      if (updateState[updateStateKey]) {
        const columnNames = responseSchema[updateStateKey];
        let updateStateValue = updateState[updateStateKey];

        switch (updateStateValue.constructor.name) {
          case 'model':
            updateStateValue = updateStateValue.toJSON();
            delete updateStateValue._id;
            delete updateStateValue.__v;
            break;
        }

        if (columnNames === '*') {
          responseState = {
            ...responseState,
            [updateStateKey]: updateStateValue,
          };
        } else {
          columnNames.forEach((columnName: string) => {
            if (updateState[updateStateKey][columnName] !== undefined) {
              responseState = {
                ...responseState,
                [updateStateKey]: {
                  ...responseState[updateStateKey],
                  [columnName]: updateState[updateStateKey][columnName],
                },
              };
            } else {
              throw `SEQUENCE ERROR: NO_UPDATE_STATE_COLUMN_NAME: ${requestState.type}: ${updateStateKey}.${columnName}`;
            }
          });
        }
      } else {
        throw `SEQUENCE ERROR: NO_UPDATE_STATE_KEY: ${requestState.type}: ${updateStateKey}`;
      }
    });
    return responseState;
  }

  static getRequestActionState(actionName: string, requestParams1: any = null, requestParams2: any = null) {
    if (typeof requestParams1 === 'string' && requestParams2 === null) {
      return { type: actionName };
    }
    if (typeof requestParams1 === 'object' && typeof requestParams2 === 'object') {
      return { ...requestParams1, ...requestParams2, type: actionName };
    }
    if (typeof requestParams1 === 'string' && typeof requestParams2 === 'object') {
      return { ...requestParams2, type: actionName };
    }
    return { ...requestParams1, type: actionName };
  }
}

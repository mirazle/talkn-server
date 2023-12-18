import tune, { Request as TuneRequest, Response as TuneResponse } from "./tune";
import untune, {
  Request as UntuneRequest,
  Response as UntuneResponse,
} from "./untune";
import fetchRanks, {
  Request as FetchRanksRequest,
  Response as FetchRanksResponse,
} from "./fetchRanks";
import fetchPosts, {
  Request as FetchPostsRequest,
  Response as FetchPostsResponse,
} from "./fetchPosts";
import fetchChDetail, {
  Request as FetchChDetailRequest,
  Response as FetchChDetailResponse,
} from "./fetchChDetail";
import post, { Request as PostRequest, Response as PostResponse } from "./post";
import disconnect from "./disconnect";

export type Requests =
  | TuneRequest
  | UntuneRequest
  | FetchRanksRequest
  | FetchPostsRequest
  | FetchChDetailRequest
  | PostRequest;

export type Responses =
  | TuneResponse
  | UntuneResponse
  | FetchRanksResponse
  | FetchPostsResponse
  | FetchChDetailResponse
  | PostResponse;

const endpoints = {
  tune,
  untune,
  fetchRanks,
  fetchPosts,
  fetchChDetail,
  post,
  disconnect,
};

export default endpoints;

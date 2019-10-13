import {Headers, HTTPClient} from "./http_client";
import {Request, Response} from "node-fetch";
import {FetchHTTPClient} from "./fetch_http_client";
import {LosslessThrottle} from "../../../../../common/src/main/ts/throttle/lossless_throttle";
import {LossyThrottle} from "../../../../../common/src/main/ts/throttle/lossy_throttle";

export class RateLimitedHTTPClient implements HTTPClient{
  constructor(readonly client: HTTPClient, readonly throttle: LossyThrottle) {}

  get(url: string, headers?: Headers): Promise<Response> {
    return this.throttle.apply(() => this.client.get(url, headers));
  }

  post(url: string, headers?: Headers, body?: string): Promise<Response> {
    return this.throttle.apply(() => this.client.post(url, headers, body));
  }

  put(url: string, headers?: Headers, body?: string): Promise<Response> {
    return this.throttle.apply(() => this.client.put(url, headers, body));
  }

  delete(url: string, headers?: Headers, body?: string): Promise<Response> {
    return this.throttle.apply(() => this.client.delete(url, headers, body));
  }

  dispatch(req: Request): Promise<Response> {
    return this.throttle.apply(() => this.client.dispatch(req));
  }
}

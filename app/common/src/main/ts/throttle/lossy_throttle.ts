import {sys} from "typescript";
import {Async} from "../async";

/**
 * An async rate limiting mechanism which performs a fixed number of retries
 * before dropping a request / operation.
 */
export class LossyThrottle {
  private reqCount = 0;
  private queueDepth = 0;
  private readonly maxRetries: number;

  /**
   * @param name of the throttle
   * @param reqPerSec number of requests allowed per second
   * @param maxRetries
   */
  constructor(readonly name: string, readonly reqPerSec: number, maxRetries: number) {
    setInterval(this.resetReqCount, 1000);
    this.name = name;
    this.maxRetries = maxRetries;
  }

  private resetReqCount = async () => {
    console.log(`Throttle ${this.name}: ${this.reqCount}qps`);
    if (this.reqCount != 0 && this.queueDepth != 0) {
      // We should never exceed reqPerSec, but if we do, bring the server down
      if (this.reqCount > this.reqPerSec) sys.exit(1);
    }
    this.reqCount = Math.max(0, this.reqCount - this.reqPerSec)
  };

  apply: <T>(fn: () => Promise<T>) => Promise<T> =
    async <T>(fn: () => Promise<T>) => {
      this.queueDepth += 1;
      const retval = await this.doThrottle(fn, 1);
      this.queueDepth -= 1;
      return retval;
    };

  private doThrottle: <T>(fn: () => Promise<T>, retryCount: number) => Promise<T> =
    async <T>(fn: () => Promise<T>, retryCount: number) => {
      if (retryCount == this.maxRetries) {
        throw Error(`Max retries (${this.maxRetries}) reached for throttle: ${this.name}`);
      }
      if (this.isOpen()) {
        this.reqCount += 1;
        return fn();
      } else {
          return await Async.delay(
            () => this.doThrottle(fn, retryCount + 1), 1000 / this.reqPerSec
          );
      }
    };

  /**
   * Should an invocation be allowed? Is the throttle open or closed?
   */
  private isOpen(): boolean {
    return this.reqCount < this.reqPerSec;
  }
}
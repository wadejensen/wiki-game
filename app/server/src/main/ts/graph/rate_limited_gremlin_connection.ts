import {process} from "gremlin";
import {LossyThrottle} from "../../../../../common/src/main/ts/throttle/lossy_throttle";
import GraphTraversal = process.GraphTraversal;
import GraphTraversalSource = process.GraphTraversalSource;
import Traverser = process.Traverser;
import {GremlinQueryBuilder, GremlinConnection} from "./gremlin_connection";

export class RateLimitedGremlinConnectionPool implements GremlinConnection {
  readonly gs: GraphTraversal[];

  constructor(
    gs: GraphTraversalSource[],
    readonly throttle: LossyThrottle,
  ) {
    this.gs = gs as unknown as GraphTraversal[];
  }

  iterate: (queryBuilder: GremlinQueryBuilder) => Promise<void> =
    (queryBuilder: GremlinQueryBuilder) =>
      this.throttle.apply(() => queryBuilder(this.getConnection()).iterate());

  toList: (queryBuilder: GremlinQueryBuilder) => Promise<Traverser[]> =
    (queryBuilder: GremlinQueryBuilder) => queryBuilder(this.getConnection()).toList();

  next: (queryBuilder: GremlinQueryBuilder) => Promise<{ value: any; done: boolean; }> =
    (queryBuilder: GremlinQueryBuilder) => queryBuilder(this.getConnection()).next();

  private getConnection() {
    const i = Math.floor(Math.random() * this.gs.length);
    return this.gs[i];
  }
}

import {process} from "gremlin";
import {LossyThrottle} from "../../../../../common/src/main/ts/throttle/lossy_throttle";
import GraphTraversal = process.GraphTraversal;
import GraphTraversalSource = process.GraphTraversalSource;
import Traverser = process.Traverser;
import {GremlinQueryBuilder, GremlinConnection} from "./gremlin_connection";

export class RateLimitedGremlinConnection implements GremlinConnection {
  readonly g: GraphTraversal;

  constructor(
    g: GraphTraversalSource,
    readonly throttle: LossyThrottle,
  ) {
    this.g = g as unknown as GraphTraversal;
  }

  iterate: (queryBuilder: GremlinQueryBuilder) => Promise<void> =
    (queryBuilder: GremlinQueryBuilder) =>
      this.throttle.apply(() => queryBuilder(this.g).iterate());

  toList: (queryBuilder: GremlinQueryBuilder) => Promise<Traverser[]> =
    (queryBuilder: GremlinQueryBuilder) => queryBuilder(this.g).toList();

  next: (queryBuilder: GremlinQueryBuilder) => Promise<{ value: any; done: boolean; }> =
    (queryBuilder: GremlinQueryBuilder) => queryBuilder(this.g).next();
}

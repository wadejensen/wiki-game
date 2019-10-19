import {process} from "gremlin";
import {LossyThrottle} from "../../../../../common/src/main/ts/throttle/lossy_throttle";
import GraphTraversal = process.GraphTraversal;
import GraphTraversalSource = process.GraphTraversalSource;
import Traverser = process.Traverser;
import {GrelimQueryBuilder, GremlinConnection} from "./gremlin_connection";

export class RateLimitedGremlinConnection implements GremlinConnection {
  readonly g: GraphTraversal;

  constructor(
    g: GraphTraversalSource,
    readonly throttle: LossyThrottle,
  ) {
    this.g = g as unknown as GraphTraversal;
  }

  iterate: (queryBuilder: GrelimQueryBuilder) => Promise<void> =
    (queryBuilder: GrelimQueryBuilder) =>
      this.throttle.apply(() => queryBuilder(this.g).iterate());

  toList(
    queryBuilder: GrelimQueryBuilder
  ): Promise<Traverser[]> {
    return queryBuilder(this.g).toList();
  }

  next(
    queryBuilder: GrelimQueryBuilder
  ): Promise<{ value: any; done: boolean; }> {
    return queryBuilder(this.g).next();
  }
}

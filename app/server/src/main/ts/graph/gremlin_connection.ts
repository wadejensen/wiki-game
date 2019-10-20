import {process} from "gremlin";
import GraphTraversal = process.GraphTraversal;
import Traverser = process.Traverser;

export type GremlinQueryBuilder = (g: GraphTraversal) => GraphTraversal;

export interface GremlinConnection {
  iterate(queryBuilder: GremlinQueryBuilder): Promise<void>
  toList(queryBuilder: GremlinQueryBuilder): Promise<Traverser[]>
  next(queryBuilder: GremlinQueryBuilder): Promise<{ value: any; done: boolean; }>
}

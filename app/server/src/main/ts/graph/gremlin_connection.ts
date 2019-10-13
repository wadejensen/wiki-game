import {process} from "gremlin";
import GraphTraversal = process.GraphTraversal;
import Traverser = process.Traverser;

export type GrelimQueryBuilder = (g: GraphTraversal) => GraphTraversal;

export interface GremlinConnection {
  iterate(queryBuilder: GrelimQueryBuilder): Promise<void>
  toList(queryBuilder: GrelimQueryBuilder): Promise<Traverser[]>
  next(queryBuilder: GrelimQueryBuilder): Promise<{ value: any; done: boolean; }>
}

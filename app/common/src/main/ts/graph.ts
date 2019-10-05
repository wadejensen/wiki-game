export namespace graphmodel {
  export type Graph = {
    nodes: Node[],
    edges: Edge[]
  }

  export type Node = {
    id: string,
    label: string,
    x?: number,
    y?: number,
    color?: string,
    size?: number,
  }

  export type Edge = {
    id: string,
    label: string,
    source: string,
    target: string,
    color?: string,
    size?: number,
    type?: 'line' | 'curve',
  }
}


export class ApplicationStats {
  constructor(
    readonly numPagesCrawled: number,
    readonly queueDepth: number,
    readonly instanceCount: number,
    readonly firstDegreeVertices: number,
    readonly secondDegreeVertices: number,
    readonly thirdDegreeVertices: number,
    readonly forthDegreeVertices: number,
    readonly totalVertices: number,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

export class ScalingStats {
  constructor(
    readonly numPagesCrawled: number,
    readonly queueDepth: number,
    readonly instanceCount: number,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

export class GraphStats {
  constructor(
    readonly firstDegreeVertices: number,
    readonly secondDegreeVertices: number,
    readonly thirdDegreeVertices: number,
    readonly forthDegreeVertices: number,
    readonly totalVertices: number,
  ) {}

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

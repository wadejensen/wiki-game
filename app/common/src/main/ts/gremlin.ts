export namespace  graphson {
  export type GraphSON = {
    vertices: Vertex[],
    edges: Edge[],
  };

  export type Edge = {
    "@type": string,
    "@value": {
      id: {
        "@type": 'g:Int64',
        "@value": number
      },
      label: string,
      inV: {
        "@type": 'g:Int64',
        "@value": number
      },
      inVLabel: string,
      outV: {
        "@type": 'g:Int64',
        "@value": number
      },
      outVLabel: string,
      // top level keys correspond to inner keys
      properties: Map<string, {
        "@type": 'g:Property',
        "@value": {
          key: string,
          value: string
        },
      }>,
    },
  };

  export type Vertex = {
    "@type": 'g:Vertex',
    "@value": {
      id: {
        "@type": 'g:Int64',
        "@value": number
      },
      label: string,
      properties: {
        [index:string]: {
          "@type": 'g:Property',
          "@value": {
            key: string,
            value: string
          },
        }[]
      },
    },
  };
}

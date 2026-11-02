import type { GraphData } from "./graphData";

// 인덱스화된 그래프: 노드 순서 = BFS(중심부터). 시뮬레이션·렌더링이 공유하는 읽기 전용 구조.
export type GraphModel = {
  data: GraphData;
  n: number;
  m: number;
  ids: string[];
  indexOf: Map<string, number>;
  hop: Int8Array;
  edgeA: Uint32Array;
  edgeB: Uint32Array;
  adj: number[][];
  /** 같은 hop 안에서의 순번 비율 0~1 (등장 지연용) */
  rank: Float32Array;
};

/** 중심에서 BFS 순서로 maxNodes개만 남긴 그래프를 모델로 만든다. */
export function buildModel(data: GraphData, maxNodes: number): GraphModel {
  const byId = new Map(data.nodes.map((nd) => [nd.id, nd]));
  const nb = new Map<string, string[]>();
  const push = (k: string, v: string) => {
    const list = nb.get(k);
    if (list) list.push(v);
    else nb.set(k, [v]);
  };
  for (const e of data.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    push(e.source, e.target);
    push(e.target, e.source);
  }
  const order: string[] = [];
  const depth = new Map<string, number>([[data.rootId, 0]]);
  const queue = [data.rootId];
  const limit = Math.max(2, maxNodes);
  while (queue.length && order.length < limit) {
    const id = queue.shift() as string;
    order.push(id);
    for (const t of nb.get(id) ?? []) {
      if (!depth.has(t)) {
        depth.set(t, (depth.get(id) as number) + 1);
        queue.push(t);
      }
    }
  }
  const indexOf = new Map(order.map((id, i) => [id, i]));
  const n = order.length;
  const edges = data.edges.filter((e) => indexOf.has(e.source) && indexOf.has(e.target));
  const edgeA = new Uint32Array(edges.length);
  const edgeB = new Uint32Array(edges.length);
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, k) => {
    const a = indexOf.get(e.source) as number;
    const b = indexOf.get(e.target) as number;
    edgeA[k] = a;
    edgeB[k] = b;
    adj[a].push(b);
    adj[b].push(a);
  });
  const hop = new Int8Array(n);
  const rank = new Float32Array(n);
  const counts: number[] = [];
  const seen: number[] = [];
  order.forEach((id, i) => {
    hop[i] = depth.get(id) as number;
    counts[hop[i]] = (counts[hop[i]] ?? 0) + 1;
  });
  order.forEach((_, i) => {
    const h = hop[i];
    seen[h] = (seen[h] ?? 0) + 1;
    rank[i] = counts[h] > 1 ? (seen[h] - 1) / (counts[h] - 1) : 0;
  });
  return { data, n, m: edges.length, ids: order, indexOf, hop, edgeA, edgeB, adj, rank };
}

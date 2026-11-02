// 그래프 데이터 모델: ID 기반, 렌더링 좌표와 분리. 외부 데이터는 props(data)로 주입한다.
export type GraphNode = { id: string; label: string; group: string };
export type GraphEdge = { id: string; source: string; target: string };
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[]; rootId: string };

const TOPICS: readonly { id: string; label: string; kids: readonly string[] }[] = [
  { id: "ai", label: "인공지능", kids: ["머신러닝", "딥러닝", "LLM", "강화학습", "컴퓨터 비전"] },
  { id: "web", label: "웹", kids: ["React", "Next.js", "WebGL", "접근성", "성능"] },
  { id: "data", label: "데이터", kids: ["SQL", "시각화", "파이프라인", "통계", "검색"] },
  { id: "design", label: "디자인", kids: ["타이포", "색채", "모션", "UX 리서치", "디자인 시스템"] },
  { id: "science", label: "과학", kids: ["물리", "천문학", "생물학", "수학", "화학"] },
  { id: "biz", label: "비즈니스", kids: ["전략", "마케팅", "재무", "제품 관리", "운영"] },
];

// 3-hop 노드 (부모 id, 라벨)
const DEEP: readonly [string, string][] = [
  ["ai-2", "RAG"], ["ai-2", "에이전트"], ["web-2", "셰이더"], ["web-1", "서버 컴포넌트"],
  ["data-1", "대시보드"], ["data-4", "벡터 검색"], ["design-2", "인터랙션"], ["design-4", "토큰"],
  ["science-1", "우주론"], ["science-3", "그래프 이론"], ["biz-3", "로드맵"], ["biz-1", "브랜딩"],
];

const CROSS: readonly [string, string][] = [
  ["ai-2", "data-4"], ["ai-4", "web-2"], ["web-3", "design-3"], ["web-4", "data-1"],
  ["data-3", "science-3"], ["design-2", "web-2"], ["science-1", "ai-0"], ["biz-3", "design-3"],
  ["data-2", "biz-4"], ["ai-1", "science-3"],
];

function build(): GraphData {
  const nodes: GraphNode[] = [{ id: "root", label: "지식 그래프", group: "root" }];
  const edges: GraphEdge[] = [];
  const link = (s: string, t: string) => edges.push({ id: `${s}~${t}`, source: s, target: t });
  for (const t of TOPICS) {
    nodes.push({ id: t.id, label: t.label, group: t.id });
    link("root", t.id);
    t.kids.forEach((k, i) => {
      nodes.push({ id: `${t.id}-${i}`, label: k, group: t.id });
      link(t.id, `${t.id}-${i}`);
    });
  }
  DEEP.forEach(([parent, label], i) => {
    const group = parent.split("-")[0];
    nodes.push({ id: `deep-${i}`, label, group });
    link(parent, `deep-${i}`);
  });
  for (const [a, b] of CROSS) link(a, b);
  return { nodes, edges, rootId: "root" };
}

export const DEFAULT_GRAPH: GraphData = build();

# Knowledge Galaxy

3D 지식 그래프 히어로. 라우트 `/heroes/knowledge-galaxy` (PRD: `Hero_PRD/02_knowledge-galaxy_PRD.md`).

## 실행
```
npm install
npm run dev        # http://localhost:3100/heroes/knowledge-galaxy
```

## 구성
| 파일 | 역할 |
|---|---|
| `KnowledgeGalaxyHero.tsx` | 클라이언트 진입점. 품질 등급·모션 감소·WebGL 폴백·레이아웃. `data` props로 외부 그래프 주입 |
| `Scene.tsx` | R3F Canvas: InstancedMesh 노드, 간선 LineSegments, flow dots, 선택 링, 라벨 투영, 카메라 포커스 |
| `Controls.tsx` | 툴바·설정 패널·노드 검색 목록·7가지 인터랙션 가이드 |
| `useHeroInteraction.ts` | 상태 머신(loading/intro/idle/interacting/transitioning/error) |
| `graphData.ts` / `graphModel.ts` / `forceSim.ts` | ID 기반 데이터, 인덱스 모델, 렌더와 분리된 3D force simulation |
| `config.ts` | 옵션 타입·성능 프리셋·색 |

## 인터랙션 7종
1. 데이터/시뮬레이션 분리, 2. 회전·줌·감쇠와 노드 드래그 충돌 방지, 3. 중심→2-hop 지연 등장, 4. hover/select 분리·링·간선 강조, 5. 3D 연동 HTML 라벨(거리·겹침·가림 제한), 6. 포커스·1-hop 필터·전체 보기, 7. flow dots·인스턴싱·시뮬 정지·노드 수 제한.

## 성능 측정 (미측정)
| 장비 | 장면(노드/간선) | flow dots | fps |
|---|---|---|---|
| (측정 후 기입) | | | |

패널 하단 "성능 정보" 줄에 fps·draw call이 표시된다.

## 알려진 제약
- 브라우저 실행·캡처·fps는 이 작업에서 수행하지 않았다. `QA.md` 참고.
- 스크린샷: `public/heroes/knowledge-galaxy/`에 추가 예정(현재 대체 이미지 `fallback.svg`만).

## 다음 단계
실기기 측정, 3D 노드 직접 키보드 포커스, 외부 데이터 어댑터.

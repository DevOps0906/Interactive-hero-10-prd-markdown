import type { FloorSpec } from "./types";
import styles from "./ArchitectureBlueprintReveal.module.css";

/** 층 메타(config.FLOORS[].rooms)에서 그리는 데모 평면도. 교체 시 public/posters 의 SVG/PNG 로 대체한다. */
export default function FloorPlan({ floor }: { floor: FloorSpec }) {
  return (
    <svg className={styles.plan} viewBox="0 0 100 80" role="img" aria-label={`${floor.label} 데모 평면도: ${floor.rooms.map((r) => r.name).join(", ")}`}>
      <rect x="2" y="2" width="96" height="76" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {floor.rooms.map((r) => (
        <g key={r.name}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="currentColor">
            {r.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

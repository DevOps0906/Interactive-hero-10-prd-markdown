import { colorOf } from "./config";
import type { SneakerConfig } from "./types";
import styles from "./SneakerConfigurator.module.css";

/** 3D 대체용 정적 측면 일러스트. 현재 선택 색을 그대로 반영해 HTML 상태와 어긋나지 않는다(오리지널 형태). */
export default function StaticShoe({ config }: { config: SneakerConfig }) {
  const c = (p: keyof SneakerConfig["colors"]) => colorOf(config.colors[p]).hex;
  return (
    <svg className={styles.staticShoe} viewBox="0 0 640 400" role="presentation" focusable="false">
      <ellipse cx="335" cy="352" rx="260" ry="12" fill="currentColor" opacity="0.12" />
      <path d="M100 290 L94 175 Q92 118 150 110 L205 108 Q235 150 285 162 Q350 172 410 196 Q500 228 566 262 Q592 276 590 296 Z" fill={c("upper")} stroke="#0003" strokeWidth="2" />
      <path d="M100 290 L94 175 Q92 118 150 110 L165 150 Q160 220 170 290 Z" fill={c("heel")} />
      <path d="M262 160 L292 205 M290 166 L322 210 M318 174 L352 214 M346 182 L380 222" stroke={c("laces")} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M72 296 L560 296 Q604 296 592 318 Q584 346 540 346 L110 346 Q64 342 72 296 Z" fill={c("sole")} stroke="#0003" strokeWidth="2" />
    </svg>
  );
}

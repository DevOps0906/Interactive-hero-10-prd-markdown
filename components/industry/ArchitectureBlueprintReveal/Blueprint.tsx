"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CAMERA, FLOOR_HEIGHT, FOOTPRINT } from "./config";
import type { Phase } from "./types";
import styles from "./ArchitectureBlueprintReveal.module.css";

const S = 52;
const C30 = Math.cos(Math.PI / 6);
const S30 = Math.sin(Math.PI / 6);
/** 3D 장면과 같은 방향(아이소메트릭)으로 투영한 선 도면 좌표 */
const iso = (x: number, y: number, z: number): string => `${(240 + (x - z) * C30 * S).toFixed(1)} ${(250 + (x + z) * S30 * S - y * S).toFixed(1)}`;

const hw = FOOTPRINT.w / 2;
const hd = FOOTPRINT.d / 2;
const corners: Array<[number, number]> = [[-hw, hd], [hw, hd], [hw, -hd], [-hw, -hd]];
const levels = [0, 1, 2, 3, 4].map((i) => i * FLOOR_HEIGHT);
const ring = (y: number, grow = 0) => corners.map(([x, z], i) => `${i === 0 ? "M" : "L"}${iso(x + Math.sign(x) * grow, y, z + Math.sign(z) * grow)}`).join(" ") + " Z";

const PATHS: Array<{ d: string; faint?: boolean }> = [
  { d: ring(-0.03, 0.9), faint: true },
  ...levels.map((y) => ({ d: ring(y) })),
  ...corners.map(([x, z], i) => ({ d: `M${iso(x, 0, z)} L${iso(x, levels[4], z)}`, faint: i === 3 })),
  ...levels.slice(0, 4).map((y) => ({ d: `M${iso(-hw, y + 0.4, hd)} L${iso(hw, y + 0.4, hd)} L${iso(hw, y + 0.4, -hd)}`, faint: true })),
  { d: `M${iso(-hw - 0.5, 0, hd + 0.5)} L${iso(-hw - 0.5, 0, hd + 1.0)} L${iso(hw + 0.5, 0, hd + 1.0)} L${iso(hw + 0.5, 0, hd + 0.5)}`, faint: true },
];

interface Props {
  phase: Phase;
  replayN: number;
  reduced: boolean;
  onDrawn: () => void;
  onSkip: () => void;
}

/** 인터랙션 1 (전반부): 도면 선 그리기. 끝나면 onDrawn 으로 3D 전환 단계를 시작한다. */
export default function Blueprint({ phase, replayN, reduced, onDrawn, onSkip }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const drawing = phase === "blueprint";

  useGSAP(
    () => {
      if (!drawing) return;
      const paths = gsap.utils.toArray<SVGPathElement>("path[data-line]", ref.current);
      if (reduced) {
        paths.forEach((p) => gsap.set(p, { strokeDasharray: "none" }));
        onSkip();
        return;
      }
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.to(paths, { strokeDashoffset: 0, duration: CAMERA.drawDuration * 0.6, ease: "power1.inOut", stagger: (CAMERA.drawDuration * 0.4) / paths.length, onComplete: onDrawn });
    },
    { scope: ref, dependencies: [drawing, replayN, reduced], revertOnUpdate: true },
  );

  return (
    <svg ref={ref} className={styles.blueprint} data-phase={phase} viewBox="0 0 480 360" preserveAspectRatio="xMidYMid meet" focusable="false">
      {PATHS.map((p, i) => (
        <path key={i} data-line d={p.d} fill="none" stroke="currentColor" strokeWidth={p.faint ? 1 : 1.6} strokeLinejoin="round" opacity={p.faint ? 0.45 : 1} />
      ))}
      <text x="240" y="338" textAnchor="middle" className={styles.bpLabel}>
        DEMO · 도면 스케치 (실제 설계 도면 아님)
      </text>
    </svg>
  );
}

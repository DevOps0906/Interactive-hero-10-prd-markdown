import * as THREE from "three";
import type { MaterialId } from "./types";

// 외부 이미지를 쓰지 않고 캔버스로 직접 그린 질감(저작권 이슈 없음). 색은 재질 color 와 곱해지므로 밝은 회색조로 그린다.
function draw(kind: MaterialId, size = 256): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) return c;
  g.fillStyle = "#e6e6e6";
  g.fillRect(0, 0, size, size);
  if (kind === "canvas") {
    // 직조: 가로·세로 실
    for (let i = 0; i < size; i += 8) {
      g.fillStyle = i % 16 ? "#d2d2d2" : "#f4f4f4";
      g.fillRect(i, 0, 4, size);
      g.fillStyle = i % 16 ? "#f0f0f0" : "#cfcfcf";
      g.fillRect(0, i, size, 4);
    }
  } else if (kind === "mesh") {
    // 육각 그물 구멍
    g.fillStyle = "#f6f6f6";
    g.fillRect(0, 0, size, size);
    const r = 11;
    for (let y = 0; y < size + r; y += r * 1.5) {
      for (let x = 0; x < size + r * 2; x += r * 1.75) {
        const ox = (Math.round(y / (r * 1.5)) % 2) * r * 0.875;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6;
          g.lineTo(x + ox + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
        }
        g.closePath();
        g.fillStyle = "#9c9c9c";
        g.fill();
      }
    }
  } else {
    // 스웨이드: 미세 노이즈(결정적 의사난수)
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 9000; i++) {
      const v = 190 + Math.floor(rnd() * 60);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd());
    }
  }
  return c;
}

export function makeTexture(kind: MaterialId, repeat: [number, number]) {
  const t = new THREE.CanvasTexture(draw(kind));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

import type { RefObject } from "react";
import { TITLE_LINES, type HeroState } from "./config";

// DOM Stage: 장식용 큰 글자(aria-hidden은 HeroSlot 스테이지가 제공). 원본 텍스트는 HeroSlot의 H1이 유지한다.
// 글자 span: --w(wght) --wd(wdth)를 GSAP가 갱신한다. 상태가 loading이면 글자를 숨기고 로딩 표시를 보인다.
export function Scene({ stageRef, state }: { stageRef: RefObject<HTMLDivElement | null>; state: HeroState }) {
  return (
    <div ref={stageRef} className="mt-stage" data-state={state}>
      <div data-skew className="mt-skew">
        {TITLE_LINES.map((line) => (
          <div key={line} className="mt-line">
            {Array.from(line).map((ch, i) => (
              <span key={`${line}-${i}`} data-char className="mt-char">
                {ch}
              </span>
            ))}
          </div>
        ))}
      </div>
      {state === "loading" && <span className="mt-loading">로딩 중…</span>}
      <style>{`
        .mt-stage{ position:relative; width:100%; height:100%; display:grid; place-items:center; overflow:hidden;
          --hero-bg:#080b12; --hero-fg:var(--color-text); --hero-accent:var(--color-primary); touch-action:pan-y; }
        .mt-skew{ display:flex; flex-direction:column; align-items:center; transform-origin:50% 50%; }
        .mt-line{ display:flex; justify-content:center; line-height:.95; }
        .mt-char{ display:inline-block; text-align:center; color:var(--hero-fg); will-change:transform;
          font-family:var(--font-sans); font-size:clamp(40px,11vw,96px); font-weight:700;
          --w:260; --wd:100; font-variation-settings:"wght" var(--w), "wdth" var(--wd); }
        @media (width >= 768px){ .mt-char{ font-size:clamp(56px,9vw,120px); } }
        @media (width >= 1200px){ .mt-char{ font-size:clamp(88px,10vw,168px); } }
        .mt-stage[data-state="loading"] .mt-char{ opacity:0; }
        .mt-stage[data-state="fallback"] .mt-char{ opacity:1; font-weight:700; }
        .mt-loading{ position:absolute; font:500 var(--text-caption)/1 var(--font-mono); color:var(--hero-accent); }
      `}</style>
    </div>
  );
}

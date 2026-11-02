import type { CSSProperties, ReactNode, Ref } from "react";
import type { HeroMeta } from "@/lib/hero/registry";

type HeroSlotProps = {
  hero: HeroMeta;
  /** 번호 줄 문구 재정의(기본 "NN / 10"). */
  kicker?: string;
  /** 효과 스테이지(aria-hidden). 생략하면 placeholder. */
  children?: ReactNode;
  /** 설명 아래 CTA 줄(버튼·상태·안내문 등 HTML). */
  cta?: ReactNode;
  /** 스테이지 위에 겹치는 비-장식 UI(로딩·정보 카드·키보드 패드·플로팅 패널). 스테이지와 같은 박스. */
  overlay?: ReactNode;
  /** 섹션 아래 설정 패널(1023 이하에서도 글 → 스테이지 → 패널 순서). */
  panel?: ReactNode;
  /** 스크롤 구간: 섹션 높이를 N 뷰포트로 늘리고 본문(.hero-pin)을 sticky 로 고정한다. */
  scroll?: number;
  /** scroll 모드에서 글 영역 위에 겹치는 후속 장(layer). 첫 장은 H1 텍스트 블록(data-layer)이다. */
  extra?: ReactNode;
  sectionRef?: Ref<HTMLElement>;
};

// 히어로 슬롯 계약: 제목·설명·CTA는 HTML, 효과 캔버스(children)는 aria-hidden 스테이지에 넣는다.
// 배치: >=1024 글 좌 / 스테이지 우, <1024 글 → 스테이지 → 패널.
export function HeroSlot({ hero, kicker, children, cta, overlay, panel, scroll, extra, sectionRef }: HeroSlotProps) {
  const scrolling = scroll !== undefined;
  const style = scrolling ? ({ "--hero-span": scroll } as CSSProperties) : undefined;
  return (
    <>
      <section ref={sectionRef} className="hero" aria-labelledby="hero-title" data-scroll={scrolling || undefined} style={style}>
        <div className="hero-pin" data-stage={scrolling || undefined}>
          <div className="hero-copy">
            <div className="hero-text" data-layer={scrolling || undefined}>
              <span className="kicker">{kicker ?? `${hero.no} / 10`}</span>
              <h1 id="hero-title">{hero.title}</h1>
              <p>{hero.description}</p>
              {cta ? <div className="hero-cta" data-cta={scrolling || undefined}>{cta}</div> : null}
            </div>
            {extra ? <div className="hero-extra">{extra}</div> : null}
          </div>
          <div className="hero-stagebox">
            <div className="hero-stage" aria-hidden="true" data-placeholder={children ? undefined : "true"}>
              {children ?? "히어로 효과 자리 (placeholder)"}
            </div>
            {overlay ? <div className="hero-overlay">{overlay}</div> : null}
          </div>
        </div>
      </section>
      {panel}
    </>
  );
}

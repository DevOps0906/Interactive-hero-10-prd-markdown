export type HeroMeta = {
  no: string;
  slug: string;
  title: string;
  description: string;
};

export const HEROES: readonly HeroMeta[] = [
  { no: "01", slug: "particle-universe", title: "Particle Universe", description: "입자 구·형태 변환·GPU 셰이더" },
  { no: "02", slug: "knowledge-galaxy", title: "Knowledge Galaxy", description: "3D 지식 그래프·선택·라벨" },
  { no: "03", slug: "magnetic-typography", title: "Magnetic Typography", description: "마그네틱 텍스트·가변 폰트" },
  { no: "04", slug: "spotlight-reveal", title: "Spotlight Reveal", description: "이중 레이어·커서 마스크" },
  { no: "05", slug: "depth-parallax", title: "Depth Parallax", description: "다층 원근·스크롤 카메라" },
  { no: "06", slug: "kinetic-type", title: "Kinetic Type", description: "마키·가변 폰트·스크롤 연동" },
  { no: "07", slug: "liquid-morphing", title: "Liquid Morphing", description: "메타볼·노이즈·굴절 소재" },
  { no: "08", slug: "3d-product-experience", title: "3D Product Experience", description: "제품 GLB·핫스팟·구성 변경" },
  { no: "09", slug: "scroll-storytelling", title: "Scroll Storytelling", description: "Pin·Scrub·3D 카메라 스토리" },
  { no: "10", slug: "cursor-constellation", title: "Cursor Constellation", description: "캔버스 입자·근접 간선·커서 궤적" },
];

export const heroHref = (slug: string) => `/heroes/${slug}`;

export function getHero(slug: string): HeroMeta {
  const hero = HEROES.find((h) => h.slug === slug);
  if (!hero) throw new Error(`Unknown hero slug: ${slug}`);
  return hero;
}

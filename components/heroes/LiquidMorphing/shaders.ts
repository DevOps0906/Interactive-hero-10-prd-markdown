// GLSL. simplex noise 3D: Ashima Arts / Stefan Gustavson (MIT).
export const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// Fresnel + view-normal 기반 iridescent (인터랙션 4)
export const SHADE_GLSL = /* glsl */ `
uniform vec3 uColorA; uniform vec3 uColorB; uniform float uColorMix;
uniform float uIrid; uniform float uIntensity; uniform float uTime;
vec3 shade(vec3 n, vec3 v){
  float f=pow(1.-clamp(dot(n,v),0.,1.),3.);
  vec3 accent=mix(uColorA,uColorB,uColorMix);
  vec3 irid=.5+.5*cos(6.28318*(vec3(0.,.33,.67)+f*1.2+dot(n,vec3(.3,.5,.7))*.6+uTime*.05));
  vec3 base=accent*(.22+.35*(n.y*.5+.5));
  vec3 col=mix(base,irid,uIrid*(.3+.7*f));
  col+=accent*f*uIntensity*.9;
  float spec=pow(clamp(dot(reflect(-v,n),normalize(vec3(.4,.7,.6))),0.,1.),32.);
  return col+spec*.6*uIntensity;
}
`;

export const BLOB_VERT = /* glsl */ `
${NOISE_GLSL}
uniform float uTime; uniform float uNoise; uniform float uScale; uniform float uMorph;
uniform vec2 uPointer; uniform float uPointerStrength; uniform float uPress;
varying vec3 vN; varying vec3 vV;
float disp(vec3 p){
  float n=snoise(p*1.3+vec3(0.,0.,uTime*.4));
  float n2=snoise(p*2.7-vec3(uTime*.3))*.5;
  float d=(n+n2*(.4+uMorph))*uNoise;
  vec3 wp=p*uScale;
  float dist=distance(wp.xy,uPointer);
  d+=exp(-dist*dist*2.2)*uPointerStrength*(.3+.9*uPress)*step(0.,p.z+.4);
  return d;
}
void main(){
  vec3 nrm=normalize(normal);
  vec3 ax=abs(nrm.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.);
  vec3 a=normalize(cross(nrm,ax)); vec3 b=cross(nrm,a); float e=.02;
  vec3 p0=position+nrm*disp(position);
  vec3 p1=position+a*e; p1+=nrm*disp(p1);
  vec3 p2=position+b*e; p2+=nrm*disp(p2);
  vec3 nn=normalize(cross(p1-p0,p2-p0));
  vec4 mv=modelViewMatrix*vec4(p0*uScale,1.);
  vN=normalize(normalMatrix*nn); vV=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}
`;

export const BLOB_FRAG = /* glsl */ `
${SHADE_GLSL}
varying vec3 vN; varying vec3 vV;
void main(){ gl_FragColor=vec4(shade(normalize(vN),normalize(vV)),1.); }
`;

// SDF smooth-min 메타볼 raymarch (인터랙션 2). 반복 수·개수는 품질 등급이 정한다.
export const META_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv=position.xy; gl_Position=vec4(position.xy,0.,1.); }
`;

export const META_FRAG = /* glsl */ `
${NOISE_GLSL}
${SHADE_GLSL}
#define MAX_STEPS 64
#define MAX_BALLS 5
varying vec2 vUv;
uniform float uAspect; uniform float uCamZ; uniform float uScale; uniform float uNoise; uniform float uMorph;
uniform vec2 uPointer; uniform float uPointerOn; uniform float uPress;
uniform int uSteps; uniform int uBalls;
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
vec3 ballPos(int i){
  float fi=float(i); float t=uTime*.6;
  vec3 c=vec3(sin(t*(.7+.13*fi)+fi*1.7),cos(t*(.9+.1*fi)+fi*2.3),sin(t*.5+fi))*(.45+.35*uMorph)*uScale;
  if(i==0 && uPointerOn>.5){ c=vec3(uPointer*vec2(uAspect,1.)*uCamZ/1.8,0.); }
  return c;
}
float map(vec3 p){
  float d=1e5;
  for(int i=0;i<MAX_BALLS;i++){
    if(i>=uBalls) break;
    float r=(i==0?.5+.25*uPress:.42)*uScale;
    d=smin(d,length(p-ballPos(i))-r,.7*uScale);
  }
  return d+snoise(p*2.2+vec3(0.,0.,uTime*.4))*.12*uNoise;
}
void main(){
  vec3 ro=vec3(0.,0.,uCamZ);
  vec3 rd=normalize(vec3(vUv.x*uAspect,vUv.y,-1.8));
  float t=0.; bool hit=false;
  for(int i=0;i<MAX_STEPS;i++){
    if(i>=uSteps) break;
    float d=map(ro+rd*t);
    if(d<.003){hit=true;break;}
    t+=d; if(t>12.) break;
  }
  if(!hit){ gl_FragColor=vec4(0.); return; }
  vec3 p=ro+rd*t; vec2 e=vec2(.01,-.01);
  vec3 n=normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));
  gl_FragColor=vec4(shade(n,normalize(-rd)),1.);
}
`;

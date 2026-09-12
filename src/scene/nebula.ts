import * as THREE from 'three';

// Фон — не картинка, а медленная процедурная туманность (fbm) на полноэкранном квaде за сценой.
// Индиго → фиолет с тёплой золотой пылью (§4.5), виньетка к краям. Дрейф ~минуты, не секунды (§4.9).
const VERT = `void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 p = (uv - .5) * vec2(uRes.x/uRes.y, 1.);
  float t = uT * .015;
  float n1 = fbm(p*1.6 + vec2(t, -t*.6));
  float n2 = fbm(p*3.2 - vec2(t*.8, t*.4) + n1);
  vec3 indigo = vec3(.055,.045,.16), violet = vec3(.16,.09,.30), dust = vec3(.36,.29,.16);
  vec3 col = indigo;
  col = mix(col, violet, smoothstep(.35,.85,n1) * .8);
  col = mix(col, dust, smoothstep(.62,.92,n2) * .35);
  float vig = smoothstep(1.25, .25, length(p));
  col *= mix(.35, 1., vig);
  gl_FragColor = vec4(col, 1.);
}`;

export function createNebula(): { mesh: THREE.Mesh; update: (t: number, w: number, h: number) => void } {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, depthWrite: false, depthTest: false,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 } },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  return {
    mesh,
    update: (t, w, h) => { mat.uniforms.uT.value = t; mat.uniforms.uRes.value.set(w, h); },
  };
}

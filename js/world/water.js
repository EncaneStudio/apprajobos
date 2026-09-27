import * as THREE from 'three';
import { WORLD, WATER_Y, getHeight } from './terrain.js';

const VS = `
attribute float depth;
varying float vDepth; varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vDepth = depth;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS = `
uniform float time; uniform vec3 sunDir; uniform vec3 sunColor; uniform vec3 skyColor; uniform vec3 shallow; uniform vec3 deep;
varying float vDepth; varying vec3 vWorld;
#include <fog_pars_fragment>
float h(vec2 p){ return sin(p.x*0.35 + time*1.3)*0.5 + sin(p.y*0.42 - time*1.1)*0.5 + sin((p.x+p.y)*0.9 + time*2.1)*0.25 + sin((p.x-p.y)*1.7 - time*2.7)*0.12; }
void main(){
  vec2 p = vWorld.xz;
  float e = 0.3;
  vec3 n = normalize(vec3(h(p - vec2(e,0.0)) - h(p + vec2(e,0.0)), 3.0, h(p - vec2(0.0,e)) - h(p + vec2(0.0,e))));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  float d = clamp(vDepth / 9.0, 0.0, 1.0);
  vec3 col = mix(shallow, deep, sqrt(d));
  col = mix(col, skyColor, fres * 0.35);
  vec3 R = reflect(-V, n);
  float spec = pow(max(dot(R, sunDir), 0.0), 120.0);
  col += sunColor * spec * 1.4;
  // espuma en la orilla
  float foamLine = smoothstep(0.45, 0.0, vDepth + sin(time*1.5 + p.x*0.3 + p.y*0.2)*0.12) * 0.8;
  float foamN = step(0.55, fract(sin(dot(floor(p*2.0), vec2(12.9898,78.233))) * 43758.5453));
  col = mix(col, vec3(0.97,1.0,1.0), foamLine * (0.6 + 0.4*foamN));
  float alpha = mix(0.55, 0.93, smoothstep(0.0, 4.0, vDepth)) + foamLine*0.3;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function buildWater(quality) {
  const seg = quality === 'baja' ? 120 : 200;
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const depth = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) depth[i] = WATER_Y - getHeight(pos.getX(i), pos.getZ(i));
  geo.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    time: { value: 0 }, sunDir: { value: new THREE.Vector3(0.3, 0.8, 0.3).normalize() }, sunColor: { value: new THREE.Color('#fff4dd') },
    skyColor: { value: new THREE.Color('#bfe4f7') }, shallow: { value: new THREE.Color('#57d0c6') }, deep: { value: new THREE.Color('#1d5f93') },
  }]);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms, transparent: true, fog: true, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y;
  mesh.renderOrder = 2;
  mesh.userData.update = (dt, sky) => {
    uniforms.time.value += dt;
    uniforms.sunDir.value.copy(sky.uniforms.sunDir.value);
    uniforms.sunColor.value.copy(sky.uniforms.sunColor.value);
    uniforms.skyColor.value.copy(sky.uniforms.horizonColor.value);
  };
  return mesh;
}

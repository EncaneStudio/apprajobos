// Estado global compartido del juego
export const G = {
  renderer: null,
  scene: null,        // escena activa
  overworld: null,    // escena del mundo abierto
  camera: null,
  clock: null,
  time: 0,            // tiempo de juego (s)
  dt: 0,
  timeScale: 1,
  hitstop: 0,
  slowmo: 0,          // Tiempo Élfico
  paused: true,
  started: false,
  inDungeon: false,
  env: null,          // entorno activo: {heightAt, collide, isWater, enemies,...}
  player: null,
  enemies: [],
  npcs: [],
  projectiles: [],
  pickups: [],
  interactables: [],
  quality: 'media',
  isTouch: false,
  settings: { sens: 1, invertY: false, vol: 0.7, music: 0.5, quality: 'auto', touch: 'auto' },
  shake: 0,
  dayTime: 9.5,       // horas (0-24)
  lockTarget: null,
  flags: {},
};

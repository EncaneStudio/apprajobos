// Disposición del mundo de Sylvaren (x: este, z: sur). Mundo de -800..800
export const VILLAGE = { x: 0, z: 160, r: 70, name: 'Aldea Brisaclara' };

export const REGIONS = [
  { id: 'aldea', name: 'Aldea Brisaclara', x: 0, z: 160, r: 110 },
  { id: 'praderas', name: 'Praderas de Ámbar', x: 20, z: 420, r: 260 },
  { id: 'bosque', name: 'Bosque Susurrante', x: -450, z: 100, r: 280 },
  { id: 'lago', name: 'Lago Espejo', x: 380, z: 120, r: 220 },
  { id: 'picos', name: 'Picos de Escarcha', x: -80, z: -480, r: 300 },
  { id: 'ciudadela', name: 'Ruinas de la Ciudadela', x: 440, z: -430, r: 170 },
  { id: 'colinas', name: 'Colinas del Alba', x: 150, z: -150, r: 200 },
  { id: 'marjal', name: 'Marjal Sombrío', x: -380, z: 450, r: 220 },
];

// Puntos aplanados del terreno (h:null => altura natural en el centro)
export const PADS = [
  { x: VILLAGE.x, z: VILLAGE.z, r0: 70, r1: 115, h: 9 },
  { x: -430, z: 60, r0: 16, r1: 34, h: null },   // santuario bosque
  { x: -120, z: -470, r0: 18, r1: 40, h: null },  // cripta
  { x: 300, z: 60, r0: 22, r1: 45, h: 3.2 },      // templo lago
  { x: 430, z: -430, r0: 40, r1: 80, h: null },   // ciudadela
  { x: -420, z: 420, r0: 18, r1: 36, h: null },   // arena
  { x: -60, z: -330, r0: 12, r1: 26, h: null },   // puesto de montaña
];

export const DUNGEON_SITES = [
  { id: 'bosque', x: -430, z: 60, rot: 0.6 },
  { id: 'cripta', x: -120, z: -470, rot: 0 },
  { id: 'templo', x: 300, z: 60, rot: -1.2 },
  { id: 'ciudadela', x: 430, z: -430, rot: 0.4 },
  { id: 'arena', x: -420, z: 420, rot: 2.2 },
];

export const WAYPOINTS = [
  { id: 'wp_aldea', name: 'Piedra de Brisaclara', x: 26, z: 196 },
  { id: 'wp_praderas', name: 'Piedra de Ámbar', x: 10, z: 420 },
  { id: 'wp_bosque', name: 'Piedra Susurrante', x: -390, z: 110 },
  { id: 'wp_lago', name: 'Piedra del Espejo', x: 270, z: 20 },
  { id: 'wp_picos', name: 'Piedra de Escarcha', x: -50, z: -345 },
  { id: 'wp_colinas', name: 'Piedra del Alba', x: 160, z: -160 },
  { id: 'wp_ciudadela', name: 'Piedra de la Ciudadela', x: 380, z: -360 },
  { id: 'wp_marjal', name: 'Piedra del Marjal', x: -380, z: 380 },
];

// Caminos de tierra (polilíneas)
export const PATHS = [
  [[0, 160], [8, 240], [20, 330], [15, 420]],
  [[0, 160], [-80, 140], [-200, 110], [-320, 90], [-430, 60]],
  [[0, 160], [80, 130], [180, 90], [270, 40], [300, 60]],
  [[0, 160], [20, 60], [60, -40], [160, -160], [300, -300], [430, -430]],
  [[20, 60], [-20, -120], [-60, -330], [-120, -470]],
  [[-200, 110], [-280, 250], [-380, 380], [-420, 420]],
];

// Campamentos y grupos de monstruos
export const CAMPS = [
  { id: 'c_pradera1', x: 40, z: 330, lvl: 1, tents: 2, enemies: ['goblin', 'goblin', 'goblin', 'goblin', 'goblin'], chest: true },
  { id: 'c_pradera2', x: -160, z: 270, lvl: 2, tents: 2, enemies: ['goblin', 'goblin', 'archer', 'goblin'], chest: true },
  { id: 'c_sureste', x: 300, z: 450, lvl: 3, tents: 3, enemies: ['goblin', 'goblin', 'archer', 'archer', 'goblin'], chest: true },
  { id: 'c_bosque1', x: -330, z: -10, lvl: 3, tents: 0, enemies: ['wolf', 'wolf', 'wolf'] },
  { id: 'c_bosque2', x: -540, z: 190, lvl: 4, tents: 3, enemies: ['goblin', 'goblin', 'brute', 'archer'], chest: true },
  { id: 'c_bosque3', x: -600, z: -60, lvl: 5, tents: 0, enemies: ['wolf', 'wolf', 'wolf', 'wolf'] },
  { id: 'c_lago1', x: 250, z: 250, lvl: 4, tents: 2, enemies: ['goblin', 'archer', 'goblin', 'archer'], chest: true },
  { id: 'c_lago2', x: 450, z: -40, lvl: 5, tents: 3, enemies: ['brute', 'goblin', 'goblin', 'goblin'], chest: true },
  { id: 'c_colinas', x: 180, z: -60, lvl: 4, tents: 2, enemies: ['goblin', 'goblin', 'goblin', 'archer'], chest: true },
  { id: 'c_monte1', x: -40, z: -290, lvl: 6, tents: 0, enemies: ['wolf', 'wolf', 'wolf', 'wolf'] },
  { id: 'c_monte2', x: 150, z: -420, lvl: 7, tents: 0, enemies: ['golem', 'golem'] },
  { id: 'c_monte3', x: -300, z: -420, lvl: 8, tents: 2, enemies: ['golem', 'archer', 'archer', 'goblin'], chest: true },
  { id: 'c_ciudadela', x: 360, z: -320, lvl: 10, tents: 2, enemies: ['brute', 'brute', 'wisp', 'wisp', 'archer'], chest: true },
  { id: 'c_marjal1', x: -330, z: 500, lvl: 5, tents: 2, enemies: ['brute', 'goblin', 'goblin'], chest: true },
  { id: 'c_marjal2', x: -520, z: 380, lvl: 6, tents: 0, enemies: ['wisp', 'wisp', 'wolf', 'wolf'] },
  { id: 'c_puente', x: 140, z: 250, lvl: 3, tents: 1, enemies: ['brute'], chest: true },
  { id: 'c_norte', x: 300, z: -200, lvl: 7, tents: 2, enemies: ['brute', 'goblin', 'archer', 'archer'], chest: true },
  { id: 'c_oeste', x: -600, z: -250, lvl: 8, tents: 0, enemies: ['golem', 'wolf', 'wolf'] },
];

// "Ecos del Bosque" (coleccionables ocultos)
export const ECHOES = [
  [-80, 100], [60, 260], [-220, 330], [130, 500], [-40, 560], [230, 380], [-470, 10], [-560, 120], [-380, 230], [-640, 200],
  [-300, -120], [420, 200], [480, 60], [350, -60], [220, -260], [90, -340], [-200, -540], [-20, -600], [500, -480], [-450, 520],
];

export const CHESTS = [
  [-250, 180], [120, 70], [520, 260], [-480, -150], [60, -200], [-150, -380], [320, -480], [-600, 520], [200, 580], [600, 380],
];

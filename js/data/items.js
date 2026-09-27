// Objetos, equipo y botín
export const RARITY = [
  { id: 0, name: 'Común', color: '#e8e8e8', mult: 1 },
  { id: 1, name: 'Poco común', color: '#6ee06e', mult: 1.25 },
  { id: 2, name: 'Raro', color: '#5aa8ff', mult: 1.55 },
  { id: 3, name: 'Épico', color: '#c77dff', mult: 1.95 },
  { id: 4, name: 'Legendario', color: '#ffa62b', mult: 2.5 },
];

export const ITEMS = {
  pocion_menor: { name: 'Poción menor', type: 'consumable', icon: '🧪', desc: 'Restaura 40 de vida.', heal: 40, price: 25, stack: 99 },
  pocion: { name: 'Poción de vida', type: 'consumable', icon: '❤️', desc: 'Restaura 120 de vida.', heal: 120, price: 70, stack: 99 },
  pocion_mayor: { name: 'Poción mayor', type: 'consumable', icon: '💖', desc: 'Restaura el 60% de la vida.', healPct: 0.6, price: 180, stack: 99 },
  elixir: { name: 'Elixir de espíritu', type: 'consumable', icon: '🔮', desc: 'Restaura 60 de espíritu.', mana: 60, price: 60, stack: 99 },
  manzana: { name: 'Manzana', type: 'consumable', icon: '🍎', desc: 'Crujiente. Restaura 15 de vida.', heal: 15, price: 5, stack: 99 },
  seta: { name: 'Seta rojiza', type: 'consumable', icon: '🍄', desc: 'Restaura 10 de vida. A Olva le encantan.', heal: 10, price: 8, stack: 99 },
  estofado: { name: 'Estofado de Olva', type: 'consumable', icon: '🍲', desc: 'Restaura 200 de vida y 50 de espíritu.', heal: 200, mana: 50, price: 150, stack: 99 },
  // materiales
  colmillo: { name: 'Colmillo de trasgo', type: 'material', icon: '🦷', desc: 'Material. Se vende bien.', price: 12, stack: 999 },
  cuerno: { name: 'Cuerno de trasgo', type: 'material', icon: '📯', desc: 'Material de artesanía.', price: 18, stack: 999 },
  piel_lobo: { name: 'Piel de lobo sombrío', type: 'material', icon: '🐺', desc: 'Cálida y suave.', price: 22, stack: 999 },
  nucleo: { name: 'Núcleo de gólem', type: 'material', icon: '💠', desc: 'Late con energía antigua.', price: 60, stack: 999 },
  esencia: { name: 'Esencia espectral', type: 'material', icon: '👻', desc: 'Fría al tacto.', price: 40, stack: 999 },
  garra_ogro: { name: 'Garra de ogro', type: 'material', icon: '🦴', desc: 'Pesada y afilada.', price: 45, stack: 999 },
  gema: { name: 'Gema de ámbar', type: 'material', icon: '🔶', desc: 'Una gema valiosa.', price: 120, stack: 999 },
  // objetos de misión
  amuleto_mira: { name: 'Amuleto de Mira', type: 'quest', icon: '📿', desc: 'Un colgante con forma de hoja.', price: 0, stack: 1 },
  frag_verde: { name: 'Fragmento Verde', type: 'quest', icon: '💚', desc: 'Fragmento del Hilo Eterno. Hebra se siente más fuerte.', price: 0, stack: 1 },
  frag_azul: { name: 'Fragmento Azul', type: 'quest', icon: '💙', desc: 'Fragmento del Hilo Eterno.', price: 0, stack: 1 },
  frag_blanco: { name: 'Fragmento Blanco', type: 'quest', icon: '🤍', desc: 'Fragmento del Hilo Eterno.', price: 0, stack: 1 },
};

export const SLOTS = { head: 'Cabeza', chest: 'Torso', legs: 'Piernas', amulet: 'Amuleto', rune: 'Runa de Hebra' };

const BASES = {
  head: [
    { name: 'Capucha de Explorador', icon: '🎩', stats: { def: 3, agi: 1 } },
    { name: 'Diadema Élfica', icon: '👑', stats: { def: 2, spi: 2 } },
    { name: 'Yelmo de Guardabosques', icon: '⛑️', stats: { def: 5, vit: 1 } },
    { name: 'Máscara de Hueso', icon: '💀', stats: { def: 3, str: 2 } },
  ],
  chest: [
    { name: 'Túnica del Campeón', icon: '👕', stats: { def: 6, vit: 2 }, tint: 0x3f7fd8 },
    { name: 'Coraza de Escamas', icon: '🥋', stats: { def: 9, str: 1 }, tint: 0x5d8a6a },
    { name: 'Manto del Viento', icon: '🧥', stats: { def: 5, agi: 3 }, tint: 0x6ab0a0 },
    { name: 'Vestiduras Arcanas', icon: '👘', stats: { def: 4, spi: 4 }, tint: 0x7a5ad0 },
    { name: 'Armadura de Ámbar', icon: '🛡️', stats: { def: 11, str: 2 }, tint: 0xd09a3a },
  ],
  legs: [
    { name: 'Calzas de Viajero', icon: '👖', stats: { def: 3, agi: 2 } },
    { name: 'Grebas de Cristal', icon: '🥾', stats: { def: 6, vit: 1 } },
    { name: 'Botas Silvanas', icon: '👢', stats: { def: 2, agi: 3 } },
  ],
  amulet: [
    { name: 'Amuleto de Brisa', icon: '📿', stats: { agi: 2, crit: 2 } },
    { name: 'Colgante de Luna', icon: '🌙', stats: { spi: 3, crit: 1 } },
    { name: 'Talismán del Oso', icon: '🐻', stats: { vit: 3, str: 1 } },
    { name: 'Ojo del Halcón', icon: '🦅', stats: { crit: 4 } },
  ],
  rune: [
    { name: 'Runa de Fuego', icon: '🔥', stats: { str: 1 }, elem: 'fuego' },
    { name: 'Runa de Escarcha', icon: '❄️', stats: { spi: 1 }, elem: 'hielo' },
    { name: 'Runa de Trueno', icon: '⚡', stats: { agi: 1 }, elem: 'rayo' },
  ],
};

const PREFIX = ['', 'Robusto', 'Afilado', 'Ancestral', 'Radiante', 'Eterno'];
let uid = 1;
export function setUid(n) { uid = Math.max(uid, n); }

export function rollRarity(bonus = 0) {
  const r = Math.random() * 100 - bonus;
  if (r < 2) return 4;
  if (r < 9) return 3;
  if (r < 25) return 2;
  if (r < 55) return 1;
  return 0;
}

export function makeGear(slot, level, rarity) {
  const list = BASES[slot];
  const b = list[Math.floor(Math.random() * list.length)];
  const R = [0, 1, 2, 3, 4][rarity];
  const mult = [1, 1.25, 1.55, 1.95, 2.5][R] * (1 + level * 0.12);
  const stats = {};
  for (const k in b.stats) stats[k] = Math.max(1, Math.round(b.stats[k] * mult));
  // estadística extra aleatoria según rareza
  const extras = ['str', 'vit', 'agi', 'spi', 'crit'];
  for (let i = 0; i < R; i++) {
    const k = extras[Math.floor(Math.random() * extras.length)];
    stats[k] = (stats[k] || 0) + Math.max(1, Math.round((1 + level * 0.15) * (0.5 + Math.random())));
  }
  const name = (PREFIX[R] ? '' : '') + b.name + (PREFIX[R] ? ' ' + PREFIX[R].toLowerCase() : '');
  return { uid: uid++, gear: true, slot, name, icon: b.icon, rarity: R, level, stats, elem: b.elem || null, tint: b.tint || null, price: Math.round(20 * mult * (R + 1)) };
}

export function randomGear(level, rarityBonus = 0) {
  const slots = ['head', 'chest', 'legs', 'amulet', 'head', 'chest', 'legs', 'rune'];
  return makeGear(slots[Math.floor(Math.random() * slots.length)], level, rollRarity(rarityBonus));
}

export const STAT_NAMES = { def: 'Defensa', str: 'Fuerza', vit: 'Vitalidad', agi: 'Agilidad', spi: 'Espíritu', crit: 'Crítico %' };
export const ELEM_NAMES = { fuego: 'Quema al enemigo con el tiempo', hielo: 'Ralentiza a los enemigos', rayo: 'Descargas encadenadas' };

// Tabla de botín por tipo de enemigo
export const LOOT = {
  goblin: [['colmillo', 0.6], ['cuerno', 0.25], ['manzana', 0.15], ['pocion_menor', 0.08]],
  archer: [['colmillo', 0.5], ['cuerno', 0.35], ['pocion_menor', 0.1]],
  wolf: [['piel_lobo', 0.7], ['colmillo', 0.2]],
  brute: [['garra_ogro', 0.8], ['cuerno', 0.5], ['pocion', 0.2], ['gema', 0.05]],
  golem: [['nucleo', 0.8], ['gema', 0.15], ['pocion', 0.2]],
  wisp: [['esencia', 0.8], ['elixir', 0.2]],
};

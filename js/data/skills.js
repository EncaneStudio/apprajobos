// Árboles de habilidades, talentos y habilidades activas
export const TREES = {
  rigido: {
    name: 'Filo Rígido', color: '#ffc861', icon: '⚔️',
    desc: 'Hebra se endurece en una hoja de luz. Golpes pesados, combos y remates.',
    nodes: [
      { id: 'r_temple', name: 'Temple de Acero', desc: '+8% daño en modo rígido por rango.', max: 3, x: 1, y: 0, req: [] },
      { id: 'r_danza', name: 'Danza de Filos', desc: 'Desbloquea el combo Tormenta de Cortes: L, L, L, pesado.', max: 1, x: 0, y: 1, req: ['r_temple'] },
      { id: 'r_estocada', name: 'Estocada Celeste', desc: 'Habilidad: embestida que atraviesa a los enemigos en línea.', max: 1, x: 2, y: 1, req: ['r_temple'], ability: 'estocada' },
      { id: 'r_halcon', name: 'Ojo del Halcón', desc: '+4% probabilidad de crítico por rango.', max: 3, x: 0, y: 2, req: ['r_danza'] },
      { id: 'r_onda', name: 'Onda de Choque', desc: 'Habilidad: clava a Hebra en el suelo y libera una onda devastadora.', max: 1, x: 2, y: 2, req: ['r_estocada'], ability: 'onda' },
      { id: 'r_meteoro', name: 'Caída Meteoro', desc: 'El golpe en picado aéreo crea una onda de choque mayor y más daño.', max: 1, x: 1, y: 3, req: ['r_halcon', 'r_onda'] },
      { id: 'r_juicio', name: 'Juicio del Alba', desc: '+25% daño mientras tu rango de estilo sea S o superior.', max: 1, x: 1, y: 4, req: ['r_meteoro'] },
    ],
  },
  flexible: {
    name: 'Látigo Vivo', color: '#63f2c0', icon: '〰️',
    desc: 'Hebra se vuelve cuerda viva. Alcance, control de masas y agarres.',
    nodes: [
      { id: 'f_alcance', name: 'Hebra Extendida', desc: '+12% alcance del látigo por rango.', max: 2, x: 1, y: 0, req: [] },
      { id: 'f_torbellino', name: 'Torbellino de Hebra', desc: 'Habilidad: giras con Hebra golpeando todo a tu alrededor.', max: 1, x: 0, y: 1, req: ['f_alcance'], ability: 'torbellino' },
      { id: 'f_tiron', name: 'Tirón Múltiple', desc: 'El Tirón (pesado en modo látigo) atrae a varios enemigos a la vez.', max: 1, x: 2, y: 1, req: ['f_alcance'] },
      { id: 'f_serpiente', name: 'Mordisco de Serpiente', desc: '+10% daño del látigo y los golpes aturden más por rango.', max: 3, x: 0, y: 2, req: ['f_torbellino'] },
      { id: 'f_prision', name: 'Nudo Prisión', desc: 'Habilidad: Hebra ata a todos los enemigos cercanos durante unos segundos.', max: 1, x: 2, y: 2, req: ['f_tiron'], ability: 'prision' },
      { id: 'f_cambio', name: 'Transmutación', desc: 'Cambiar de modo en mitad de un combo provoca un golpe extra de gran daño.', max: 1, x: 1, y: 3, req: ['f_serpiente', 'f_prision'] },
      { id: 'f_celeste', name: 'Serpiente Celeste', desc: 'Los golpes del látigo encadenan descargas a un enemigo cercano.', max: 1, x: 1, y: 4, req: ['f_cambio'] },
    ],
  },
  espiritu: {
    name: 'Espíritu Élfico', color: '#b7a3ff', icon: '✨',
    desc: 'La sangre élfica de Eryn: magia, movilidad y supervivencia.',
    nodes: [
      { id: 'e_vigor', name: 'Vigor Silvano', desc: '+10% vida máxima por rango.', max: 3, x: 1, y: 0, req: [] },
      { id: 'e_tiempo', name: 'Tiempo Élfico', desc: 'La esquiva perfecta ralentiza el tiempo +1,5 s por rango.', max: 2, x: 0, y: 1, req: ['e_vigor'] },
      { id: 'e_sanar', name: 'Luz Sanadora', desc: 'Habilidad: restaura el 35% de tu vida.', max: 1, x: 2, y: 1, req: ['e_vigor'], ability: 'sanar' },
      { id: 'e_vela', name: 'Vela de Hebra', desc: 'Planear consume un 50% menos de aguante y es más rápido.', max: 1, x: 0, y: 2, req: ['e_tiempo'] },
      { id: 'e_lluvia', name: 'Lluvia de Filos', desc: 'Habilidad: hojas espectrales caen sobre los enemigos cercanos.', max: 1, x: 2, y: 2, req: ['e_sanar'], ability: 'lluvia' },
      { id: 'e_fluir', name: 'Fluir Arcano', desc: 'Regeneras espíritu al golpear y +20% regeneración pasiva por rango.', max: 2, x: 1, y: 3, req: ['e_vela', 'e_lluvia'] },
      { id: 'e_bendicion', name: 'Bendición de Sylvaren', desc: 'Al caer, resucitas con el 50% de vida (una vez cada 5 minutos).', max: 1, x: 1, y: 4, req: ['e_fluir'] },
    ],
  },
};

export const ABILITIES = {
  estocada: { name: 'Estocada Celeste', icon: '🗡️', cost: 20, cd: 5, desc: 'Embestida perforante.' },
  onda: { name: 'Onda de Choque', icon: '💥', cost: 30, cd: 8, desc: 'Onda sísmica en área.' },
  torbellino: { name: 'Torbellino', icon: '🌀', cost: 25, cd: 6, desc: 'Giro de látigo en área.' },
  prision: { name: 'Nudo Prisión', icon: '🪢', cost: 35, cd: 12, desc: 'Inmoviliza a los enemigos.' },
  sanar: { name: 'Luz Sanadora', icon: '💚', cost: 40, cd: 15, desc: 'Cura el 35% de vida.' },
  lluvia: { name: 'Lluvia de Filos', icon: '🌠', cost: 45, cd: 14, desc: 'Hojas espectrales.' },
};

export const ATTRS = {
  str: { name: 'Fuerza', desc: '+2 de ataque por punto.' },
  vit: { name: 'Vitalidad', desc: '+12 de vida máxima por punto.' },
  agi: { name: 'Agilidad', desc: '+5 aguante, +0,5% crítico y velocidad.' },
  spi: { name: 'Espíritu', desc: '+6 espíritu máx. y +3% daño de habilidades.' },
};

export const STYLE_RANKS = [
  { r: 'D', name: 'Discreto', pts: 0, color: '#9aa4b1' },
  { r: 'C', name: 'Certero', pts: 100, color: '#7ad3ff' },
  { r: 'B', name: 'Brutal', pts: 250, color: '#7affb0' },
  { r: 'A', name: 'Arrollador', pts: 450, color: '#ffe066' },
  { r: 'S', name: 'Sublime', pts: 700, color: '#ffa94d' },
  { r: 'SS', name: 'Salvaje', pts: 1000, color: '#ff6b6b' },
  { r: 'SSS', name: '¡Soberbio!', pts: 1400, color: '#ff4fd8' },
];

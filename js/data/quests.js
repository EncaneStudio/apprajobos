// Misiones principales y secundarias
// Tipos de etapa: talk{npc}, kill{target|targets, count}, collect{item,count,take}, reach{x,z,r}, dungeon{id,minDiff}, echo{count}, waypoint{id}
export const QUESTS = {
  mq1: {
    name: 'El Despertar', type: 'main', giver: 'ylwen',
    desc: 'Despiertas en Aldea Brisaclara con una extraña cuerda viva atada a la muñeca. Dice llamarse Hebra... y no para de hablar.',
    stages: [{ type: 'talk', npc: 'ylwen', text: 'Habla con la anciana Ylwen en la plaza' }],
    rewards: { xp: 60, gold: 30 }, next: 'mq2',
  },
  mq2: {
    name: 'Primer Filo', type: 'main', giver: 'ylwen',
    desc: 'Un campamento de trasgos acosa las Praderas de Ámbar, al sur de la aldea. Demuestra de lo que Hebra y tú sois capaces.',
    stages: [
      { type: 'kill', targets: ['goblin', 'archer'], count: 5, text: 'Derrota trasgos en las Praderas de Ámbar', loc: [40, 330] },
      { type: 'talk', npc: 'ylwen', text: 'Vuelve con Ylwen' },
    ],
    rewards: { xp: 180, gold: 120, items: [['pocion_menor', 3]] }, next: 'mq3',
  },
  mq3: {
    name: 'El Santuario Musgoso', type: 'main', giver: 'ylwen',
    desc: 'El primer fragmento del Hilo Eterno late en el corazón del Bosque Susurrante, dentro de un santuario olvidado.',
    stages: [
      { type: 'waypoint', id: 'wp_bosque', text: 'Activa la Piedra Susurrante del bosque', loc: [-390, 110] },
      { type: 'dungeon', id: 'bosque', minDiff: 0, text: 'Supera el Santuario Musgoso', loc: [-430, 60] },
      { type: 'talk', npc: 'ylwen', text: 'Lleva el Fragmento Verde a Ylwen' },
    ],
    rewards: { xp: 450, gold: 250, items: [['pocion', 2]] }, next: 'mq4',
  },
  mq4: {
    name: 'Ecos del Lago', type: 'main', giver: 'ylwen',
    desc: 'Ylwen habla de un templo hundido en el Lago Espejo. El pescador Loto sabe cómo llegar.',
    stages: [
      { type: 'talk', npc: 'loto', text: 'Encuentra al pescador Loto en la orilla del Lago Espejo' },
      { type: 'dungeon', id: 'templo', minDiff: 0, text: 'Supera el Templo Sumergido', loc: [300, 60] },
      { type: 'talk', npc: 'loto', text: 'Vuelve con Loto' },
    ],
    rewards: { xp: 700, gold: 400, items: [['pocion', 3], ['elixir', 2]] }, next: 'mq5',
  },
  mq5: {
    name: 'Frío Ancestral', type: 'main', giver: 'loto',
    desc: 'El último fragmento está sellado en una cripta helada de los Picos de Escarcha. El explorador Doran acampa en la ladera.',
    stages: [
      { type: 'talk', npc: 'doran', text: 'Habla con Doran en el puesto de montaña' },
      { type: 'dungeon', id: 'cripta', minDiff: 0, text: 'Supera la Cripta Helada', loc: [-120, -470] },
      { type: 'talk', npc: 'doran', text: 'Vuelve con Doran' },
    ],
    rewards: { xp: 1000, gold: 600, items: [['pocion_mayor', 2]] }, next: 'mq6',
  },
  mq6: {
    name: 'La Ciudadela Caída', type: 'main', giver: 'doran',
    desc: 'Con los tres fragmentos, Hebra recuerda todo: el Heraldo del Vacío aguarda en la Ciudadela. Es hora de atar el último nudo.',
    stages: [
      { type: 'talk', npc: 'ylwen', text: 'Regresa a Brisaclara y habla con Ylwen' },
      { type: 'dungeon', id: 'ciudadela', minDiff: 0, text: 'Derrota al Heraldo del Vacío en la Ciudadela Caída', loc: [430, -430] },
      { type: 'talk', npc: 'ylwen', text: 'Vuelve a Brisaclara' },
    ],
    rewards: { xp: 2500, gold: 2000 }, next: null,
  },

  // ---------- Secundarias ----------
  sq_pieles: {
    name: 'Pieles para el invierno', type: 'side', giver: 'brann',
    desc: 'Brann el cazador necesita pieles de lobo sombrío para los abrigos del invierno. Los lobos merodean por el Bosque Susurrante.',
    stages: [
      { type: 'collect', item: 'piel_lobo', count: 4, take: true, text: 'Consigue pieles de lobo sombrío', loc: [-330, -10] },
      { type: 'talk', npc: 'brann', text: 'Entrega las pieles a Brann' },
    ],
    rewards: { xp: 220, gold: 150, gear: { rarity: 2 } },
  },
  sq_lobos: {
    name: 'La manada de la sombra', type: 'side', giver: 'brann',
    desc: 'Una manada enorme de lobos ha bajado de las montañas. Reduce su número.',
    stages: [
      { type: 'kill', targets: ['wolf'], count: 8, text: 'Caza lobos sombríos' },
      { type: 'talk', npc: 'brann', text: 'Informa a Brann' },
    ],
    rewards: { xp: 400, gold: 250, items: [['pocion', 2]] }, req: 'sq_pieles',
  },
  sq_amuleto: {
    name: 'El amuleto perdido', type: 'side', giver: 'mira',
    desc: 'Mira perdió el amuleto de su madre jugando junto al Lago Espejo, en la orilla sur.',
    stages: [
      { type: 'collect', item: 'amuleto_mira', count: 1, take: true, text: 'Busca el amuleto en la orilla sur del lago', loc: [372, 262] },
      { type: 'talk', npc: 'mira', text: 'Devuelve el amuleto a Mira' },
    ],
    rewards: { xp: 180, gold: 80, gear: { slot: 'amulet', rarity: 2 } },
  },
  sq_setas: {
    name: 'El ingrediente secreto', type: 'side', giver: 'olva',
    desc: 'Olva la cocinera necesita setas rojizas del bosque para su famoso estofado.',
    stages: [
      { type: 'collect', item: 'seta', count: 6, take: true, text: 'Recoge setas rojizas en el bosque', loc: [-300, 120] },
      { type: 'talk', npc: 'olva', text: 'Lleva las setas a Olva' },
    ],
    rewards: { xp: 150, gold: 60, items: [['estofado', 3]] },
  },
  sq_plaga: {
    name: 'Plaga de trasgos', type: 'side', giver: 'tessa',
    desc: 'La capitana Tessa quiere que limpies los alrededores de trasgos.',
    stages: [
      { type: 'kill', targets: ['goblin', 'archer'], count: 12, text: 'Derrota trasgos' },
      { type: 'talk', npc: 'tessa', text: 'Informa a la capitana Tessa' },
    ],
    rewards: { xp: 320, gold: 220 },
  },
  sq_ogro: {
    name: 'El ogro del puente', type: 'side', giver: 'tessa',
    desc: 'Un ogro enorme bloquea el paso al este de las praderas. Tessa no tiene hombres suficientes.',
    stages: [
      { type: 'kill', targets: ['brute'], count: 1, text: 'Derrota al ogro del puente', loc: [140, 250] },
      { type: 'talk', npc: 'tessa', text: 'Vuelve con Tessa' },
    ],
    rewards: { xp: 380, gold: 300, gear: { slot: 'chest', rarity: 3 } }, req: 'sq_plaga',
  },
  sq_ecos: {
    name: 'Ecos del Bosque', type: 'side', giver: 'fennel',
    desc: 'El sabio Fennel habla de espíritus antiguos, los Ecos, escondidos por todo Sylvaren.',
    stages: [
      { type: 'echo', count: 5, text: 'Encuentra Ecos del Bosque (brillos verdes)' },
      { type: 'talk', npc: 'fennel', text: 'Habla con Fennel' },
    ],
    rewards: { xp: 300, gold: 100, sp: 2 },
  },
  sq_heroe: {
    name: 'Prueba del Héroe', type: 'side', giver: 'fennel',
    desc: 'Fennel quiere ver si eres digno: supera cualquier mazmorra en dificultad Difícil o superior.',
    stages: [
      { type: 'dungeon', id: 'any', minDiff: 1, text: 'Supera una mazmorra en Difícil o superior' },
      { type: 'talk', npc: 'fennel', text: 'Habla con Fennel' },
    ],
    rewards: { xp: 800, gold: 500, gear: { rarity: 4 } }, req: 'mq3',
  },
  sq_golems: {
    name: 'Corazones de piedra', type: 'side', giver: 'doran',
    desc: 'Doran estudia los gólems de los Picos. Necesita que destruyas algunos.',
    stages: [
      { type: 'kill', targets: ['golem'], count: 3, text: 'Destruye gólems de piedra', loc: [150, -420] },
      { type: 'talk', npc: 'doran', text: 'Vuelve con Doran' },
    ],
    rewards: { xp: 700, gold: 450, gear: { rarity: 3 } },
  },
  sq_arena: {
    name: 'Gloria en la Arena', type: 'side', giver: 'garrick',
    desc: 'Garrick el gladiador te reta a sobrevivir a la Arena de los Ecos.',
    stages: [
      { type: 'dungeon', id: 'arena', minDiff: 0, text: 'Supera la Arena de los Ecos', loc: [-420, 420] },
      { type: 'talk', npc: 'garrick', text: 'Habla con Garrick' },
    ],
    rewards: { xp: 600, gold: 400, gear: { slot: 'rune', rarity: 3 } },
  },
  sq_espectros: {
    name: 'Luces en el marjal', type: 'side', giver: 'garrick',
    desc: 'Espectros vagan por el Marjal Sombrío. Garrick quiere que acabes con ellos.',
    stages: [
      { type: 'kill', targets: ['wisp'], count: 4, text: 'Disipa espectros', loc: [-520, 380] },
      { type: 'talk', npc: 'garrick', text: 'Habla con Garrick' },
    ],
    rewards: { xp: 450, gold: 300, items: [['elixir', 3]] },
  },
};

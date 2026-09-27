// NPCs y sus diálogos. Líneas: [hablante, texto]; 'N' = el propio NPC, 'H' = Hebra, 'E' = Eryn
const offer = (id, lines, yes = 'Acepto', no = 'Ahora no') => ({
  when: (c) => c.canOffer(id), lines,
  options: [{ t: yes, a: (c) => c.start(id) }, { t: no, a: () => {} }],
});

export const NPCS = {
  ylwen: {
    name: 'Anciana Ylwen', role: 'Sabia de la aldea', x: 4, z: 150, look: { skin: 0xf2d2b6, hair: 0xe8e8e8, robe: 0x6b4fa0, ears: true, height: 0.92, staff: true },
    topics: [
      { when: (c) => c.at('mq1', 0), lines: [
        ['N', 'Por fin despiertas, joven Eryn. Te encontramos en el claro, inconsciente... con eso atado a la muñeca.'],
        ['H', '¿"Eso"? Disculpe, señora. Soy Hebra, último hilo vivo del Hilo Eterno. Indestructible, elegante y, sobre todo, modesto.'],
        ['N', 'Así que es cierto... una hebra del Hilo que tejió Sylvaren. Cuando la Ciudadela cayó, el Hilo se rompió en fragmentos y el Vacío empezó a filtrarse.'],
        ['E', '¿Y qué tengo yo que ver con todo eso?'],
        ['H', 'Mucho. Me has elegido tú... bueno, yo te he elegido a ti. Puedo endurecerme como una espada o volverme flexible como un látigo. Tú pones los brazos, yo el talento.'],
        ['N', 'Antes de hablar de profecías, demuéstranos que puedes defenderte. Los trasgos acampan al sur, en las Praderas de Ámbar.'],
      ], then: (c) => c.advance('mq1') },
      { when: (c) => c.at('mq2', 0), lines: [['N', 'Los trasgos están al sur, siguiendo el camino. Ten cuidado, pequeño.'], ['H', 'Recuerda: clic izquierdo golpes rápidos, derecho golpe pesado, Q para cambiar mi forma. Soy muy versátil.']] },
      { when: (c) => c.at('mq2', 1), lines: [
        ['N', '¡Has vuelto de una pieza! Las praderas respiran tranquilas.'],
        ['N', 'Escucha: el primer fragmento del Hilo Eterno late en el Bosque Susurrante, al oeste. Allí se alza el Santuario Musgoso.'],
        ['N', 'Activa la Piedra de Viento del bosque. Esas piedras antiguas te permiten viajar al instante entre ellas.'],
        ['H', 'Viajar al instante... ¡por fin algo que no implique caminar!'],
      ], then: (c) => c.advance('mq2') },
      { when: (c) => c.active('mq3') && c.stage('mq3') < 2, lines: [['N', 'El santuario está en lo profundo del bosque, al oeste. Que el viento te guíe.']] },
      { when: (c) => c.at('mq3', 2), lines: [
        ['N', 'El Fragmento Verde... ¡lo has conseguido! Siento su calidez desde aquí.'],
        ['H', 'Y yo me siento... más largo. Y más guapo. Gracias por preguntar.'],
        ['N', 'El segundo fragmento reposa bajo las aguas del Lago Espejo, al este. Busca al pescador Loto en la orilla.'],
      ], then: (c) => c.advance('mq3') },
      { when: (c) => c.at('mq4', 0), lines: [['N', 'Loto pesca en la orilla oeste del Lago Espejo. Sigue el camino al este.']] },
      { when: (c) => c.at('mq6', 0), lines: [
        ['N', 'Tres fragmentos. Hebra brilla como no la había visto nunca.'],
        ['H', 'Ahora lo recuerdo todo, Ylwen. El Heraldo del Vacío cortó el Hilo desde la Ciudadela. Y quiere terminar el trabajo.'],
        ['N', 'Entonces ve al noreste, a las ruinas de la Ciudadela Caída. Todo Sylvaren confía en vosotros.'],
        ['E', 'Volveremos.'],
      ], then: (c) => c.advance('mq6') },
      { when: (c) => c.at('mq6', 1), lines: [['N', 'La Ciudadela está al noreste, más allá de las Colinas del Alba. Ten valor.']] },
      { when: (c) => c.at('mq6', 2), lines: [
        ['N', 'El cielo... ¡el cielo vuelve a ser azul! Lo has logrado, Eryn.'],
        ['H', 'Técnicamente lo hemos logrado. Yo hice el setenta por ciento. Pero no llevamos la cuenta.'],
        ['N', 'El Hilo Eterno vuelve a tejer Sylvaren. Pero aún quedan monstruos y mazmorras llenas de tesoros. Tu leyenda acaba de empezar.'],
      ], then: (c) => { c.advance('mq6'); c.ending(); } },
      { when: () => true, lines: [['N', 'El viento sopla fresco hoy. Buena señal.']], rand: [
        'Hace cien años, la Ciudadela brillaba en el horizonte. Ahora solo quedan ruinas.',
        'Los ancianos decían que el Hilo Eterno cantaba en las noches sin luna.',
        'Descansa cuando lo necesites, Eryn. Hasta los héroes duermen.',
      ] },
    ],
  },
  brann: {
    name: 'Brann', role: 'Cazador', x: -26, z: 150, look: { skin: 0xd9a47a, hair: 0x6b3e1f, robe: 0x5d6b3a, beard: true, height: 1.08, bow: true },
    topics: [
      offer('sq_pieles', [['N', '¡Eh, tú, el de la cuerda parlante! El invierno llega pronto y necesito pieles de lobo sombrío.'], ['N', 'Tráeme cuatro. Los lobos rondan por el Bosque Susurrante, al oeste.']]),
      { when: (c) => c.at('sq_pieles', 0), lines: [['N', 'Cuatro pieles de lobo sombrío. Los encontrarás en el bosque del oeste.']] },
      { when: (c) => c.at('sq_pieles', 1), lines: [['N', '¡Excelentes pieles! Toma, esto te protegerá mejor que esa túnica.']], then: (c) => c.advance('sq_pieles') },
      offer('sq_lobos', [['N', 'Me preocupa la manada. Son demasiados y se acercan a la aldea.'], ['N', '¿Podrías cazar ocho lobos? Te pagaré bien.']]),
      { when: (c) => c.at('sq_lobos', 1), lines: [['N', 'Los aullidos han cesado. Gracias, cazador.']], then: (c) => c.advance('sq_lobos') },
      { when: () => true, lines: [['N', 'La caza enseña paciencia. Y a correr rápido.']], rand: ['Los lobos sombríos atacan en manada. Esquiva y contraataca.', 'Si ves un ogro, no intentes pararlo: esquívalo.'] },
    ],
  },
  mira: {
    name: 'Mira', role: 'Niña', x: 18, z: 172, look: { skin: 0xf5d5bd, hair: 0xd27a3a, robe: 0xe07a9a, height: 0.62, child: true }, wander: 6,
    topics: [
      offer('sq_amuleto', [['N', 'Snif... Perdí el amuleto de mamá jugando en la orilla sur del lago...'], ['H', 'Oh, no. No soporto las lágrimas. Me destiñen.'], ['N', '¿Me ayudarías a encontrarlo?']], '¡Claro que sí!', 'Lo siento'),
      { when: (c) => c.at('sq_amuleto', 0), lines: [['N', 'Estaba en la orilla sur del Lago Espejo, donde hay arena y juncos.']] },
      { when: (c) => c.at('sq_amuleto', 1), lines: [['N', '¡Mi amuleto! ¡Gracias, gracias, gracias! Toma, mamá decía que este otro trae suerte a los viajeros.']], then: (c) => c.advance('sq_amuleto') },
      { when: () => true, lines: [['N', '¡Tu espada habla! ¿Puede cantar?']], rand: ['¿Es verdad que los elfos viven mil años?', 'Cuando sea mayor seré aventurera como tú.', 'Hebra, ¿me cuentas un cuento?'] },
    ],
  },
  olva: {
    name: 'Olva', role: 'Cocinera', x: 30, z: 140, look: { skin: 0xe8b894, hair: 0x3a2a1a, robe: 0xc9543a, height: 0.95, wide: true },
    topics: [
      offer('sq_setas', [['N', '¡Cariño, tienes cara de hambre! Pero me faltan setas rojizas para mi estofado.'], ['N', 'Crecen en el Bosque Susurrante. ¿Me traes seis?']]),
      { when: (c) => c.at('sq_setas', 0), lines: [['N', 'Seis setas rojizas del bosque, cielo. Son rojas con motitas blancas.']] },
      { when: (c) => c.at('sq_setas', 1), lines: [['N', '¡Perfectas! Toma, estofado recién hecho. Cura cuerpo y alma.']], then: (c) => c.advance('sq_setas') },
      { when: () => true, lines: [['N', 'Un buen guiso arregla cualquier día.']], rand: ['Las manzanas de Brisaclara son las más dulces del reino.', 'Come bien antes de entrar en una mazmorra, ¡que te conozco!'] },
    ],
  },
  tessa: {
    name: 'Capitana Tessa', role: 'Guardia', x: 10, z: 222, look: { skin: 0xc98f6a, hair: 0x1a1a1a, robe: 0x8a2f2f, armor: true, height: 1.02, spear: true },
    topics: [
      offer('sq_plaga', [['N', 'Alto. ¿Sabes pelear? Bien. Los trasgos se multiplican como conejos.'], ['N', 'Derrota a doce y hablaremos de recompensas.']]),
      { when: (c) => c.at('sq_plaga', 0), lines: [['N', 'Doce trasgos. Hay campamentos en las praderas y en las colinas.']] },
      { when: (c) => c.at('sq_plaga', 1), lines: [['N', 'Buen trabajo, soldado. Aquí tienes tu paga.']], then: (c) => c.advance('sq_plaga') },
      offer('sq_ogro', [['N', 'Tengo un problema más gordo. Literalmente. Un ogro bloquea el puente del este.'], ['N', 'Si lo derrotas, la armadura de mi padre es tuya.']]),
      { when: (c) => c.at('sq_ogro', 0), lines: [['N', 'El ogro está junto al puente, al sureste de la aldea. Esquiva sus golpes cuando brille en rojo.']] },
      { when: (c) => c.at('sq_ogro', 1), lines: [['N', '¡Impresionante! Mi padre estaría orgulloso de que su armadura la lleve alguien como tú.']], then: (c) => c.advance('sq_ogro') },
      { when: () => true, lines: [['N', 'Brisaclara está a salvo mientras yo esté de guardia.']], rand: ['Cuando un enemigo brilla en rojo, prepárate para esquivar.', 'Una esquiva en el último instante ralentiza el mundo. Úsalo.'] },
    ],
  },
  fennel: {
    name: 'Sabio Fennel', role: 'Erudito', x: -14, z: 176, look: { skin: 0xe8c8a8, hair: 0x9a9aa8, robe: 0x2f5f8a, ears: true, beard: true, height: 1.0, staff: true },
    topics: [
      offer('sq_ecos', [['N', 'Fascinante... una hebra del Hilo. Dime, ¿has visto los Ecos del Bosque?'], ['N', 'Son espíritus antiguos, brillos verdes escondidos en lugares recónditos. Encuentra cinco y te enseñaré algo útil.']]),
      { when: (c) => c.at('sq_ecos', 0), lines: [['N', 'Los Ecos se esconden en cimas, bosques y orillas. Escucha su tintineo.']] },
      { when: (c) => c.at('sq_ecos', 1), lines: [['N', 'Cinco Ecos... siento su canto en ti. Toma este conocimiento antiguo.']], then: (c) => c.advance('sq_ecos') },
      offer('sq_heroe', [['N', 'Las mazmorras guardan retos mayores para quien se atreva. Supera una en dificultad Difícil o superior.']]),
      { when: (c) => c.at('sq_heroe', 1), lines: [['N', 'Eres digno de una leyenda. Acepta esta reliquia.']], then: (c) => c.advance('sq_heroe') },
      { when: () => true, lines: [['N', 'El conocimiento es la espada más afilada. Bueno... después de Hebra.']], rand: ['Cada 3 Ecos que encuentres fortalecerán tu espíritu.', 'Las dificultades superiores de las mazmorras dan mejores recompensas.', 'Pulsa P para ver tus árboles de habilidades.'] },
    ],
  },
  pim: {
    name: 'Pim', role: 'Mercader', x: -18, z: 138, shop: 'merchant', look: { skin: 0xf0c8a0, hair: 0x8a5a2a, robe: 0x3a8a5a, height: 0.85, wide: true, hat: true },
    topics: [
      { when: () => true, lines: [['N', '¡Bienvenido a los Tesoros de Pim! Pociones, elixires y buenos precios... casi siempre.']], options: [{ t: 'Comerciar', a: (c) => c.shop('merchant') }, { t: 'Adiós', a: () => {} }] },
    ],
  },
  hilda: {
    name: 'Hilda', role: 'Herrera', x: 38, z: 170, shop: 'smith', look: { skin: 0xd99a7a, hair: 0xb8402a, robe: 0x4a4a52, armor: true, height: 1.05, wide: true },
    topics: [
      { when: () => true, lines: [['N', '¿Una espada que habla y que no se rompe? Me quitas el trabajo. Pero la armadura sí la vendo.']], options: [{ t: 'Ver equipo', a: (c) => c.shop('smith') }, { t: 'Adiós', a: () => {} }] },
    ],
  },
  loto: {
    name: 'Pescador Loto', role: 'Pescador', x: 262, z: 42, look: { skin: 0xc9905a, hair: 0x2a2a2a, robe: 0x3a6a8a, height: 0.98, hat: true },
    topics: [
      { when: (c) => c.at('mq4', 0), lines: [
        ['N', '¿Te envía Ylwen? Entonces buscas el Templo Sumergido.'],
        ['N', 'Está ahí mismo, en la península. La entrada brilla cuando cae la tarde. Dicen que dentro vive una serpiente enorme.'],
        ['H', '¿Una serpiente? Perfecto. Siempre he querido conocer a un pariente lejano.'],
      ], then: (c) => c.advance('mq4') },
      { when: (c) => c.at('mq4', 2), lines: [
        ['N', '¡Has vuelto del templo! Y la serpiente... ¿de verdad? Los peces vuelven a saltar.'],
        ['N', 'Si buscas el último fragmento, ve a los Picos de Escarcha, al norte. El explorador Doran conoce las montañas.'],
      ], then: (c) => c.advance('mq4') },
      { when: () => true, lines: [['N', 'El lago está en calma hoy. Buen día para pescar.']], rand: ['Si nadas demasiado lejos, te quedarás sin aguante.', 'Al atardecer el lago parece un espejo de verdad.'] },
    ],
  },
  doran: {
    name: 'Explorador Doran', role: 'Explorador', x: -52, z: -322, look: { skin: 0xe0b090, hair: 0xc8a060, robe: 0x7a5a3a, beard: true, height: 1.04, hat: true },
    topics: [
      { when: (c) => c.at('mq5', 0), lines: [
        ['N', 'Brr... ¿Qué te trae a estas alturas, forastero? ¿La Cripta Helada? Estás loco. Me caes bien.'],
        ['N', 'Está más arriba, al noroeste de aquí. Cuidado con los gólems: golpes lentos pero devastadores.'],
      ], then: (c) => c.advance('mq5') },
      { when: (c) => c.at('mq5', 2), lines: [
        ['N', '¡Saliste de la cripta! Y ese brillo... Hebra está completa, ¿verdad?'],
        ['H', 'Casi. Ahora sé dónde está el que me cortó en pedazos. Y le debo una.'],
        ['N', 'Entonces vuelve con Ylwen. Ella sabrá qué hacer.'],
      ], then: (c) => c.advance('mq5') },
      offer('sq_golems', [['N', 'Estudio los gólems de los Picos. Sus núcleos son fascinantes.'], ['N', 'Destruye tres y comparte conmigo lo que descubras.']]),
      { when: (c) => c.at('sq_golems', 1), lines: [['N', '¡Asombroso! Mi investigación avanzará décadas. Toma esto.']], then: (c) => c.advance('sq_golems') },
      { when: () => true, lines: [['N', 'El frío aquí arriba se mete en los huesos.']], rand: ['Desde la cima se ve todo Sylvaren.', 'Planear desde las montañas es la forma más rápida de bajar.'] },
    ],
  },
  garrick: {
    name: 'Garrick', role: 'Gladiador', x: -404, z: 410, look: { skin: 0xa8704a, hair: 0x1a1a1a, robe: 0x8a6a2a, armor: true, beard: true, height: 1.15, wide: true },
    topics: [
      offer('sq_arena', [['N', '¡Ja! Otro aspirante a leyenda. La Arena de los Ecos pone a prueba a los mejores guerreros.'], ['N', 'Sobrevive a sus oleadas y te daré algo digno de ti.']], '¡Acepto el reto!', 'Quizá luego'),
      { when: (c) => c.at('sq_arena', 1), lines: [['N', '¡Lo has conseguido! La arena canta tu nombre. Toma, una runa forjada para campeones.']], then: (c) => c.advance('sq_arena') },
      offer('sq_espectros', [['N', 'Por las noches, luces fantasmales flotan en el marjal. Espectros. Acaba con cuatro.']]),
      { when: (c) => c.at('sq_espectros', 1), lines: [['N', 'El marjal está en paz. Buen trabajo, campeón.']], then: (c) => c.advance('sq_espectros') },
      { when: () => true, lines: [['N', 'Cada dificultad superior de la arena es un nuevo nivel de gloria.']], rand: ['Mantén el combo vivo: cuanto mayor tu rango, más experiencia ganas.', 'Cambiar entre espada y látigo en mitad del combo es de maestros.'] },
    ],
  },
  aldeano1: {
    name: 'Aldeano Tomé', role: 'Granjero', x: -40, z: 190, look: { skin: 0xe0a880, hair: 0x5a3a1a, robe: 0x8a7a4a, height: 1.0, hat: true }, wander: 8,
    topics: [{ when: () => true, lines: [['N', 'Las cosechas van bien este año.']], rand: ['He visto trasgos rondando el molino por la noche.', '¿Has probado a planear desde el molino? Mantén pulsado salto en el aire.', 'Mi vaca ha vuelto a escaparse...'] }],
  },
  aldeano2: {
    name: 'Aldeana Lía', role: 'Tejedora', x: 50, z: 150, look: { skin: 0xf0d0b0, hair: 0xe8c860, robe: 0x5a8aca, ears: true, height: 0.95 }, wander: 6,
    topics: [{ when: () => true, lines: [['N', 'Tejo con hilo normal, nada que ver con Hebra, ¡ja!']], rand: ['Los elfos de tu clan vivían en los bosques del oeste.', 'Dicen que hay una mazmorra que es solo una arena de combate.', 'Pulsa M para ver el mapa y viajar entre Piedras de Viento.'] }],
  },
};

// Frases de Hebra, la espada-cuerda parlante
export const HEBRA = {
  intro: ['Buenos días, dormilón. Soy Hebra. Tu espada, tu látigo y tu conciencia. Vamos a buscar a la anciana de la aldea.'],
  idle: [
    '¿Sabías que llevo tres mil años sin que nadie me haga un nudo decente?',
    'Este paisaje es precioso. Casi tanto como yo en modo rígido.',
    'Si ves algo brillante, cógelo. Si ves algo con dientes, golpéalo.',
    'Hace un día perfecto para cortar cosas.',
    'Oye, ¿tú oyes eso? Ah no, soy yo tarareando.',
    'Mi antiguo portador tenía menos estilo. Y más barba.',
    'Si te aburres, siempre podemos buscar una mazmorra. Por diversión.',
    'Las Piedras de Viento son geniales: viajar sin sudar.',
    '¿Has probado a encadenar golpes y cambiar de forma a la vez? Me encanta que me hagas eso.',
  ],
  combat: ['¡Enemigos! Por fin algo de acción.', '¡Allá vamos! Enséñales quién manda.', 'Ooh, compañía. Y no de la simpática.', '¡A bailar!'],
  lowHp: ['¡Oye! Esa sangre no es decorativa. Bebe una poción (tecla 4).', 'Estás muy herido. Quizá esquivar no sea mala idea.', '¡Retirada táctica! O poción. Una de las dos.'],
  levelUp: ['¡Subes de nivel! Reparte tus puntos, que no se oxiden.', 'Más fuerte, más rápido, más guapo. Bueno, eso último soy yo.', '¡Nivel nuevo! Echa un vistazo a los árboles de habilidades (P).'],
  rankS: ['¡Eso es estilo!', '¡Sublime! Sigue así.', '¡Me encanta cuando haces eso!'],
  rankSSS: ['¡¡SOBERBIO!! ¡Esto es arte!', '¡Somos imparables!', '¡Que alguien escriba una canción sobre esto!'],
  switchFlex: ['¡Modo látigo! Más alcance, más caos.', 'Flexible como un junco, mortal como una serpiente.'],
  switchRigid: ['¡Modo espada! Firme y afilado.', 'Duro como el acero. Más duro, en realidad.'],
  perfect: ['¡Tiempo Élfico! Todo se ralentiza... ¡aprovecha!', '¡Esquiva perfecta! Ahora, ¡castígalos!'],
  dungeon: ['Huele a humedad y a tesoro. Mi combinación favorita.', 'Mazmorra. Cuidado con las trampas... y con los bichos.', 'Qué ambiente tan acogedor. Si eres un murciélago.'],
  boss: ['Eso es... grande. Muy grande. ¡Vamos!', 'Un jefe. Estudia sus movimientos y esquiva cuando brille.', 'Siento el Vacío en esa cosa. ¡Acabemos con ella!'],
  bossKill: ['¡Lo hemos logrado! ¿Has visto qué látigo? Digo... ¡qué golpe!', '¡Victoria! Eso merece un buen botín.'],
  night: ['Se hace de noche. Los espectros salen a pasear.', 'Qué estrellas... me recuerdan a cuando el Hilo estaba entero.'],
  glide: ['¡Me despliego como una vela! Mantén el salto en el aire para planear.'],
  swim: ['Agua. Odio el agua. Me encrespo.', 'Nada rápido, que te quedas sin aguante.'],
  climb: ['Escalar gasta aguante. Vigila el círculo verde.'],
  chest: ['¡Un cofre! Lo mejor de ser aventurero.', 'Ábrelo, ábrelo, ábrelo...'],
  death: ['Eso ha dolido. Volvamos a intentarlo.', 'Nota mental: no dejar que nos maten.'],
  echo: ['¡Un Eco del Bosque! Suena como mi abuela.', 'Otro Eco. Qué tintineo tan bonito.'],
  quest: ['¡Misión completada! Me encanta tachar cosas.', 'Otra historia para contar.'],
  brute: ['Grande, feo y lento. Esquiva y golpea por detrás.'],
  firstEnemyTip: ['Consejo: pulsa F para fijar a un enemigo. Encadena clic izquierdo para combos, y termina con clic derecho.'],
  fragment: ['¡Un fragmento del Hilo! Siento... siento que me crecen cosas. Nuevos poderes.'],
};

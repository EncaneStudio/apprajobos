# Sylvaren: El Hilo Eterno

Videojuego de acción y aventura en 3D, en mundo abierto y con vista en tercera persona, que funciona directamente en el navegador (ordenador y móvil). Mezcla la exploración y el estilo visual de *Breath of the Wild* con el combate hack & slash de *Devil May Cry* y *Bayonetta*.

Eres **Eryn**, un elfo de Sylvaren que despierta con **Hebra** atada a la muñeca: una cuerda mágica, indestructible y muy parlanchina que puede **endurecerse como una espada** o **volverse flexible como un látigo**. Hebra es tu arma y tu compañera de aventura, y comenta todo lo que haces.

## Cómo jugar

El juego no necesita compilación: son archivos estáticos (HTML + módulos ES + Three.js incluido en `lib/`).

```bash
# desde la raíz del repositorio
python3 -m http.server 8080
# abre http://localhost:8080
```

> Los módulos ES no se cargan con `file://`, así que hace falta un servidor HTTP. También funciona en GitHub Pages sin configurar nada.

## Características

- **Mundo abierto grande** (1,6 × 1,6 km) generado proceduralmente: praderas, el Bosque Susurrante, los Picos de Escarcha nevados, el Lago Espejo, un marjal y las ruinas de la Ciudadela.
- **Estética BotW**: sombreado cel/toon, hierba que se mueve con el viento y se aparta a tu paso, árboles redondeados, agua estilizada con espuma en la orilla, nubes, ciclo de día y noche con estrellas y música generativa de piano.
- **Exploración**: escalar pendientes (gasta aguante), planear con Hebra desplegada como vela, nadar, doble salto, Piedras de Viento para viajar al instante y un mapa que se va descubriendo.
- **Combate hack & slash**:
  - Espada: `L-L-L-L`, `L-P` *Alzamiento* (mantén P para seguir al enemigo por el aire), `L-L-P` *Tormenta de Cortes*, combos aéreos y *Caída Meteoro*.
  - Látigo: `L-L-L` *Espiral de Hebra*, *Tirón* (atrae a los enemigos o te lanza hacia los grandes) y *Látigo Descendente*.
  - Cambia de forma en mitad de un combo (*Transmutación*), esquiva perfecta con **Tiempo Élfico** (cámara lenta), fijado de objetivo, hitstop y temblor de cámara.
  - **Medidor de estilo** de D a SSS que multiplica la experiencia.
- **Progresión**: niveles, 4 características (Fuerza, Vitalidad, Agilidad, Espíritu), **3 árboles de habilidades** con talentos y 6 habilidades activas, inventario, equipo en 5 espacios con rarezas (común → legendario) y runas elementales (fuego, hielo, rayo).
- **NPCs y misiones**: aldea con aldeanos, tienda, herrería, diálogos con opciones, 6 misiones principales y 11 secundarias, marcadores de misión y rastreador.
- **Monstruos**: trasgos, arqueros, lobos sombríos, ogros, gólems y espectros. Tienen IA, avisan antes de atacar, puedes lanzarlos al aire y hacer malabares con ellos, y viven en campamentos con cofres.
- **Mazmorras instanciadas**: Santuario Musgoso, Templo Sumergido, Cripta Helada, Ciudadela Caída y Arena de los Ecos. Tienen salas con oleadas, un puzle de cristales, **jefes con patrones propios** y **4 dificultades** (Normal, Difícil, Heroico y Mítico), con mejor botín, récords y una clasificación final.
- **Coleccionables**: 20 Ecos del Bosque escondidos (cada 3 dan un punto de habilidad) y cofres ocultos.
- Guardado automático en `localStorage`, ajustes de calidad gráfica y soporte para mando.

## Controles

| Acción | Ordenador | Móvil |
| --- | --- | --- |
| Moverse / cámara | WASD / ratón | Joystick izquierdo / arrastrar a la derecha |
| Saltar / planear | Espacio (mantener en el aire) | ⤒ |
| Esprintar | Mayús | 🏃 |
| Golpe rápido / pesado | Clic izq. / Clic der. | ⚔️ / 💥 |
| Cambiar forma de Hebra | Q | 🔄 |
| Esquivar | C | 💨 |
| Fijar objetivo | F | 🎯 |
| Interactuar | E | ✋ |
| Habilidades / poción | 1 2 3 / 4 | Botones de habilidad / 🧪 |
| Menús | I, P, J, M, Esc | 🎒 🗺️ 📜 ✨ |

## Estructura

```
index.html          HUD, menús y controles táctiles
css/style.css       Interfaz
lib/                Three.js r170 (MIT)
js/main.js          Arranque, bucle de juego, transiciones y guardado
js/player.js        Eryn: movimiento, estados, animación y combos
js/guardian.js      Modelo del protagonista (assets/guardian.glb) movido por el rig procedural
js/sword.js         Hebra: cuerda verlet que pasa de espada a látigo
js/combat.js        Ataques, poses, medidor de estilo y daño
js/enemies.js       Monstruos, jefes, IA y proyectiles
js/dungeon.js       Mazmorras instanciadas y dificultades
js/world/*          Terreno, cielo, agua, vegetación y estructuras
js/data/*           Objetos, habilidades, misiones, NPCs y el mundo
js/ui.js            HUD y menús
```

# Guardián Silverleaf — rig y animaciones

- `rig_guardian.py`: script de Blender (bpy) que toma el `.blend` de Meshy, crea el esqueleto
  (18 huesos), calcula los pesos (automáticos + correcciones por zonas: trenzas, vaina, piernas,
  hombreras), separa la cuerda y la empuñadura de la espalda, y exporta `guardian_rig.glb`.
  Uso: `python rig_guardian.py -- ruta/al/modelo.blend` con el módulo `bpy` instalado.
- `www/modelo3d/guardian_rig.glb`: modelo con esqueleto y pesos, sin animaciones (lo usa el visor).
- `www/modelo3d/guardian_animado.glb`: el mismo modelo con las 13 animaciones horneadas
  (reposo, andar, correr, agacharse, sigilo, saltar, combo, giratorio, escudo, arco, planear,
  nadar, baile) a 30 fps, en el sitio (sin desplazamiento raíz). Se importa en Blender, Unity, Godot…
- La espada, el escudo, el arco y la paravela los añade el motor (`rajobos3d.js`) en los huesos de las manos.

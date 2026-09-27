// Rejilla espacial de colisionadores (círculos y cajas orientadas) en el plano XZ
export class Colliders {
  constructor(cell = 16) { this.cell = cell; this.map = new Map(); this.all = []; }
  key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  _insert(c, minX, maxX, minZ, maxZ) {
    const cs = this.cell;
    for (let ix = Math.floor(minX / cs); ix <= Math.floor(maxX / cs); ix++)
      for (let iz = Math.floor(minZ / cs); iz <= Math.floor(maxZ / cs); iz++) {
        const k = this.key(ix, iz);
        let l = this.map.get(k); if (!l) { l = []; this.map.set(k, l); }
        l.push(c);
      }
    this.all.push(c);
  }
  addCircle(x, z, r, top = 1e9, bottom = -1e9) {
    const c = { t: 0, x, z, r, top, bottom };
    this._insert(c, x - r, x + r, z - r, z + r);
    return c;
  }
  addBox(x, z, hw, hd, rot = 0, top = 1e9, bottom = -1e9) {
    const c = { t: 1, x, z, hw, hd, cos: Math.cos(rot), sin: Math.sin(rot), top, bottom };
    const R = Math.hypot(hw, hd);
    this._insert(c, x - R, x + R, z - R, z + R);
    return c;
  }
  query(x, z) { return this.map.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))) || null; }
  // Empuja pos (con .x .z .y) fuera de los colisionadores. Devuelve true si hubo colisión
  resolve(pos, radius, height = 1.8) {
    const l = this.query(pos.x, pos.z);
    if (!l) return false;
    let hit = false;
    for (const c of l) {
      if (pos.y > c.top || pos.y + height < c.bottom) continue;
      if (c.t === 0) {
        const dx = pos.x - c.x, dz = pos.z - c.z, rr = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.001;
          pos.x = c.x + (dx / d) * rr; pos.z = c.z + (dz / d) * rr; hit = true;
        }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ox = lx - cx, oz = lz - cz;
        const d2 = ox * ox + oz * oz;
        if (d2 < radius * radius) {
          let nlx, nlz;
          if (d2 > 1e-6) { const d = Math.sqrt(d2); nlx = cx + (ox / d) * radius; nlz = cz + (oz / d) * radius; }
          else {
            // dentro de la caja: salir por el lado más cercano
            const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
            if (px < pz) { nlx = Math.sign(lx || 1) * (c.hw + radius); nlz = lz; } else { nlx = lx; nlz = Math.sign(lz || 1) * (c.hd + radius); }
          }
          pos.x = c.x + nlx * c.cos + nlz * c.sin; pos.z = c.z - nlx * c.sin + nlz * c.cos; hit = true;
        }
      }
    }
    return hit;
  }
  // ¿Está el punto dentro de un colisionador grande? (para la cámara)
  blocked(x, z, y) {
    const l = this.query(x, z);
    if (!l) return false;
    for (const c of l) {
      if (y > c.top || y < c.bottom) continue;
      if (c.t === 0) { if (c.r > 1.0 && (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.2) ** 2) return true; }
      else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + 0.2 && Math.abs(lz) < c.hd + 0.2) return true;
      }
    }
    return false;
  }
  // Altura de "suelo" extra (techo de cajas sobre las que se puede estar de pie)
  floorAt(x, z, y) {
    const l = this.query(x, z);
    let best = -1e9;
    if (!l) return best;
    for (const c of l) {
      if (c.top > 1e8 || !c.walkable) continue;
      if (y < c.top - 0.6) continue;
      if (c.t === 0) { if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r && c.top > best) best = c.top; }
      else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd && c.top > best) best = c.top;
      }
    }
    return best;
  }
}

import bpy, sys, colorsys
import numpy as np
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=sys.argv[-1])
o = bpy.data.objects['output_unwrapped']
o.name = 'Guardian'
ZOFF = 0.9516
o.location.z += ZOFF
bpy.context.view_layer.objects.active = o
o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def B(p):  # three.js (antes del desplazamiento) -> Blender
    x, y, z = p
    return Vector((x, -z, y + ZOFF))

J = {
 'hips': ((0.065,-0.02,0.04),(0.06,0.1,0.03),None),
 'spine': ((0.06,0.1,0.03),(0.05,0.28,0.02),'hips'),
 'chest': ((0.05,0.28,0.02),(0.045,0.53,0.03),'spine'),
 'neck': ((0.045,0.53,0.03),(0.045,0.62,0.03),'chest'),
 'head': ((0.045,0.62,0.03),(0.045,0.95,0.03),'neck'),
 'uArmR': ((-0.175,0.45,0.02),(-0.265,0.22,0.03),'chest'),
 'lArmR': ((-0.265,0.22,0.03),(-0.31,0.02,0.07),'uArmR'),
 'handR': ((-0.31,0.02,0.07),(-0.335,-0.09,0.09),'lArmR'),
 'uArmL': ((0.265,0.45,0.02),(0.33,0.22,0.03),'chest'),
 'lArmL': ((0.33,0.22,0.03),(0.37,0.02,0.07),'uArmL'),
 'handL': ((0.37,0.02,0.07),(0.39,-0.09,0.09),'lArmL'),
 'thighR': ((-0.04,-0.06,0.04),(-0.07,-0.42,0.0),'hips'),
 'shinR': ((-0.07,-0.42,0.0),(-0.13,-0.85,-0.01),'thighR'),
 'footR': ((-0.13,-0.85,-0.01),(-0.15,-0.93,0.17),'shinR'),
 'thighL': ((0.17,-0.06,0.04),(0.2,-0.42,0.0),'hips'),
 'shinL': ((0.2,-0.42,0.0),(0.29,-0.85,-0.01),'thighL'),
 'footL': ((0.29,-0.85,-0.01),(0.33,-0.93,0.17),'shinL'),
 'hilt': ((-0.155,0.55,-0.1),(-0.26,0.9,-0.1),'chest'),
}
arm_data = bpy.data.armatures.new('GuardianRig')
arm = bpy.data.objects.new('GuardianRig', arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for n,(h,t,p) in J.items():
    b = arm_data.edit_bones.new(n); b.head = B(h); b.tail = B(t); eb[n] = b
for n,(h,t,p) in J.items():
    if p: eb[n].parent = eb[p]
    eb[n].use_deform = n != 'hilt'
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')
o.select_set(True); arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print('groups', [g.name for g in o.vertex_groups])
for bn in ('hilt',):
    arm_data.bones[bn].use_deform = True
    if bn not in o.vertex_groups: o.vertex_groups.new(name=bn)

# color por vértice desde la textura base
me = o.data
img = bpy.data.images['texture_0']
W, H = img.size
px = np.empty(W*H*4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)
uvl = me.uv_layers.active.data
vuv = {}
for poly in me.polygons:
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index
        if vi not in vuv: vuv[vi] = uvl[li].uv.copy()
def lin2srgb(c): return c*12.92 if c <= 0.0031308 else 1.055*c**(1/2.4)-0.055
stats = {}
CLS = {}
def setw(v, weights):
    for g in o.vertex_groups:
        g.remove([v.index])
    for n, w in weights.items():
        if w > 0.001: o.vertex_groups[n].add([v.index], w, 'REPLACE')
def sst(a,b,x):
    t=min(1,max(0,(x-a)/(b-a))); return t*t*(3-2*t)
for v in me.vertices:
    uv = vuv.get(v.index)
    if uv is None: continue
    # vecindad 3x3 para robustez
    cx = int(uv.x*W) % W; cy = min(H-1, max(0, int(uv.y*H)))
    c = px[max(0,cy-1):cy+2, max(0,cx-1):cx+2, :3].reshape(-1,3).mean(0)
    r,g,b = [lin2srgb(float(k)) for k in c]
    hh, ss, vv = colorsys.rgb_to_hsv(r,g,b); hue = hh*360
    X, Y, Z = v.co.x, v.co.z - ZOFF, -v.co.y   # coordenadas three
    cls = None
    if 240 <= hue <= 300 and ss > 0.2 and Y > 0.45 and X < 0.0 and Z < 0.06: cls = 'hilt'
    elif 150 <= hue <= 200 and ss > 0.2 and Y > 0.62 and Z < 0.06 and X < 0.0: cls = 'hilt'
    elif 160 <= hue <= 205 and ss > 0.3 and vv > 0.45 and Y < 0.15 and X < 0.02: cls = 'rope'
    if cls == 'rope' and 'rope' not in o.vertex_groups: o.vertex_groups.new(name='rope')
    elif (ss < 0.12 and vv > 0.55 and (Y > 0.5 or X < -0.33 or Z < -0.14)) or (X < -0.34 and Y > 0.12 and vv > 0.45 and ss < 0.3): cls = 'hair'
    elif 15 <= hue <= 55 and ss > 0.35 and Y > -0.3 and (Z < -0.06 or (X > 0.36 and Y < 0.05)): cls = 'scab'
    stats[cls] = stats.get(cls, 0) + 1
    CLS[v.index] = cls
    if cls == 'hilt': setw(v, {'hilt': 1.0})
    elif cls == 'rope': setw(v, {'rope': 1.0})
    elif cls == 'hair':
        if X < -0.3 and Y < 0.5: setw(v, {'chest': 1.0})
        else:
            h = sst(0.45, 0.62, Y); setw(v, {'head': h, 'chest': 1-h})
    elif cls == 'scab':
        c2 = sst(0.05, 0.3, Y); setw(v, {'chest': c2, 'spine': 1-c2})
print('clases', stats)
# --- limpieza: pesos de brazo solo cerca del brazo ---
import math
def segd(p, a, b):
    a=Vector(a); b=Vector(b); ab=b-a; t=max(0,min(1,(p-a).dot(ab)/ab.length_squared)); return (a+ab*t-p).length
ARMB = {n: J[n] for n in ('uArmL','lArmL','handL','uArmR','lArmR','handR')}
ncl = 0
for v in me.vertices:
    P = Vector((v.co.x, v.co.z - ZOFF, -v.co.y))
    cw = {o.vertex_groups[g.group].name: g.weight for g in v.groups}
    if 'rope' in cw or 'hilt' in cw: continue
    armw = {k: w for k, w in cw.items() if k in ARMB}
    if not armw or P.y > 0.3: continue
    side = 'L' if P.x > 0.065 else 'R'
    dmin = min(segd(P, ARMB[n][0], ARMB[n][1]) for n in ARMB if n.endswith(side))
    dbody = min(segd(P, J[n][0], J[n][1]) - rr for n, rr in (('hips',0.15),('spine',0.15),('chest',0.16),('thighL',0.075),('thighR',0.075)))
    if (dmin - 0.05) > dbody and dmin > 0.06:
        rest = {k: w for k, w in cw.items() if k not in ARMB}
        if sum(rest.values()) < 0.05:
            rest = {'hips': 1.0} if P.y < 0.08 else ({'spine': 1.0} if P.y < 0.25 else {'chest': 1.0})
        setw(v, rest); ncl += 1
print('limpieza brazos', ncl)
nadd = 0
for v in me.vertices:
    P = Vector((v.co.x, v.co.z - ZOFF, -v.co.y))
    if P.y > 0.36: continue
    cw = {o.vertex_groups[g.group].name: g.weight for g in v.groups}
    if any(k in cw for k in ('hilt','rope','head')) or CLS.get(v.index) in ('hair','scab'): continue
    side = 'L' if P.x > 0.065 else 'R'
    ds = {n: segd(P, ARMB[n][0], ARMB[n][1]) for n in ARMB if n.endswith(side)}
    dmin = min(ds.values())
    dbody = min(segd(P, J[n][0], J[n][1]) - rr for n, rr in (('hips',0.15),('spine',0.15),('chest',0.16),('thighL',0.075),('thighR',0.075)))
    armsum = sum(w for k, w in cw.items() if k in ARMB)
    if dmin < 0.1 and dmin - 0.045 < dbody and armsum < 0.98:
        ws = {n: 1.0 / (d**4 + 1e-7) for n, d in ds.items()}
        tot = sum(ws.values()); ws = {n: w / tot for n, w in ws.items()}
        if P.y > 0.3:
            k = sst(0.36, 0.3, P.y)
            mix = {n: w * (1 - k) for n, w in cw.items()}
            for n, w in ws.items(): mix[n] = mix.get(n, 0) + w * k
            ws = mix
        setw(v, ws); nadd += 1
print('brazos reasignados', nadd)
npad = 0
for v in me.vertices:
    uv = vuv.get(v.index)
    if uv is None or CLS.get(v.index): continue
    X, Y, Z = v.co.x, v.co.z - ZOFF, -v.co.y
    if not (0.36 < Y < 0.58): continue
    cx = int(uv.x*W) % W; cy = min(H-1, max(0, int(uv.y*H)))
    r,g,bb = [lin2srgb(float(k)) for k in px[cy, cx, :3]]
    hh, ss, vv = colorsys.rgb_to_hsv(r,g,bb)
    if not (10 <= hh*360 <= 45 and ss > 0.35 and vv < 0.6): continue
    cw = {o.vertex_groups[gg.group].name: gg.weight for gg in v.groups}
    for side, sx in (('L', 0.265), ('R', -0.175)):
        if abs(X - sx) < 0.12 and cw.get('uArm' + side, 0) > 0:
            u = cw['uArm' + side]; nw = dict(cw); nw['uArm' + side] = u * 0.35; nw['chest'] = nw.get('chest', 0) + u * 0.65
            setw(v, nw); npad += 1; break
print('hombreras', npad)
# --- pesos geométricos de piernas ---
def curw(v):
    return {o.vertex_groups[g.group].name: g.weight for g in v.groups}
LEGS = {'L': [J['thighL'][0], J['shinL'][0], J['footL'][0], J['footL'][1]], 'R': [J['thighR'][0], J['shinR'][0], J['footR'][0], J['footR'][1]]}
nleg = 0
for v in me.vertices:
    uv = vuv.get(v.index)
    X, Y, Z = v.co.x, v.co.z - ZOFF, -v.co.y
    if Y > 0.0: continue
    cw = curw(v)
    if any(k in cw for k in ('hilt','rope')): continue
    if CLS.get(v.index) in ('scab', 'hair'): continue
    PV = Vector((X, Y, Z))
    darm = min(segd(PV, ARMB[n][0], ARMB[n][1]) for n in ARMB)
    dleg = min(segd(PV, J[n][0], J[n][1]) for n in ('thighL', 'thighR', 'shinL', 'shinR')) - 0.075
    if darm < 0.11 and darm - 0.045 < dleg: continue
    if cw.get('chest',0)+cw.get('spine',0) > 0.6 and Z < -0.06 and Y > -0.3: continue  # vaina / trenza
    cx = int(uv.x*W) % W; cy = min(H-1, max(0, int(uv.y*H)))
    c = px[cy, cx, :3]; r,g,bb = [lin2srgb(float(k)) for k in c]
    hh, ss, vv = colorsys.rgb_to_hsv(r,g,bb); hue = hh*360
    if Y > -0.2 and 180 <= hue <= 235 and ss > 0.3:
        a2 = sst(0.0, 0.13, X)
        setw(v, {'hips': 0.6, 'thighL': 0.4*a2, 'thighR': 0.4*(1-a2)}); nleg += 1; continue
    side = 'L' if X > 0.065 else 'R'
    th, kn, an, to = LEGS[side]
    ws = sst(kn[1]+0.05, kn[1]-0.05, Y)
    wf = sst(an[1]+0.02, an[1]-0.07, Y) * (0.6 + 0.4*sst(an[2], an[2]+0.08, Z))
    wt = 1 - ws
    ws = ws * (1 - wf)
    geo = {'thigh'+side: wt, 'shin'+side: ws, 'foot'+side: wf}
    if Y > -0.14:
        k = sst(0.0, -0.14, Y)
        mix = {}
        for n,w in cw.items(): mix[n] = mix.get(n,0) + w*(1-k)
        for n,w in geo.items(): mix[n] = mix.get(n,0) + w*k
        geo = mix
    setw(v, geo); nleg += 1
print('piernas', nleg)
import bmesh
gi = {g.name: g.index for g in o.vertex_groups}
bm = bmesh.new(); bm.from_mesh(me)
dl = bm.verts.layers.deform.active
def wv(v, n): return v[dl].get(gi[n], 0.0)
handish = lambda v: wv(v,'handR') + wv(v,'lArmR') > 0.3
kill = []
for fc in bm.faces:
    vs = fc.verts
    r = [wv(v,'rope') > 0.5 for v in vs]; h = [wv(v,'hilt') > 0.5 for v in vs]
    if any(r): kill.append(fc)
    elif any(h) and not all(h): kill.append(fc)
    else:
        hs = [CLS.get(v.index) in ('hair', 'scab') for v in vs]
        am = [sum(wv(v, n) for n in ('uArmL','lArmL','handL','uArmR','lArmR','handR')) > 0.4 for v in vs]
        if any(hs) and any(am[i] and not hs[i] for i in range(len(vs))): kill.append(fc)
bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY')
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')
bnd = [e for e in bm.edges if e.is_boundary]
res = bmesh.ops.holes_fill(bm, edges=bnd, sides=24)
print('huecos rellenados', len(res['faces']), 'bordes', len(bnd))
bm.to_mesh(me); bm.free()
print('caras separadas', len(kill))
if 'rope' in o.vertex_groups: o.vertex_groups.remove(o.vertex_groups['rope'])
bpy.ops.object.select_all(action='DESELECT')
o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.vertex_group_limit_total(limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
for img in bpy.data.images:
    if img.name=='texture_0_metallic_roughness': img.scale(1024,1024)
    if img.name=='normal': img.scale(1024,1024)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath='guardian_rig.glb', export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88, export_skins=True, export_animations=False, use_selection=False)
bpy.ops.wm.save_as_mainfile(filepath='guardian_rig.blend')

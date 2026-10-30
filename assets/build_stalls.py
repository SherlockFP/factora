# Tatlı Tycoon — 10 tezgah modeli (Blender headless).
# Kullanım:  blender.exe -b -P assets/build_stalls.py
# Çıktı:     assets/props/stall_*.glb
#
# Yön: müşteri tarafı Blender -Y (= three.js +Z). Zemin merkezi (0,0,0).
# Kompozisyon: tezgah (0..1.0) → ön panel amblemi → tezgah üstü ürünler (≤1.85)
#              → tente (2.0..2.5) → tabela (2.8..3.5).

import bpy
import math
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'props')
os.makedirs(OUT, exist_ok=True)
random.seed(19)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, rough=0.8, metal=0.0, emit=None, es=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (color[0], color[1], color[2], 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (emit[0], emit[1], emit[2], 1.0)
        b.inputs['Emission Strength'].default_value = es
    return m


def box(loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = size
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def cyl(loc, radius, depth, mat, rot=(0, 0, 0), verts=14):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def cone(loc, r1, r2, depth, mat, rot=(0, 0, 0), verts=12):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc)
    o = bpy.context.object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def cone_striped(loc, r1, r2, depth, mats, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc)
    o = bpy.context.object
    o.rotation_euler = rot
    for m in mats:
        o.data.materials.append(m)
    for i, p in enumerate(o.data.polygons):
        if p.loop_total in (3, 4):
            p.material_index = (i // 2) % len(mats)
        else:
            p.material_index = 0
    return o


def sphere(loc, radius, mat, scale=(1, 1, 1), subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=loc)
    o = bpy.context.object
    o.scale = scale
    o.data.materials.append(mat)
    return o


def torus(loc, major, minor, mat, rot=(0, 0, 0), maj_seg=20, min_seg=6):
    bpy.ops.mesh.primitive_torus_add(location=loc, major_radius=major, minor_radius=minor,
                                     major_segments=maj_seg, minor_segments=min_seg)
    o = bpy.context.object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def export(name):
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
        except Exception:
            pass
        bpy.ops.object.join()
        joined = bpy.context.object
        joined.name = name
        joined.data.name = name
        objs = [joined]
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_apply=True, export_yup=True,
    )
    for o in objs:
        o.data.calc_loop_triangles()
    print('EXPORTED', name, os.path.getsize(path), 'bytes',
          sum(len(o.data.loop_triangles) for o in objs), 'tris')


# ------------------------------------------------------------ ortak yapı
WOOD = None


def counter(width, body, top, trim, y=-0.42, height=1.0, depth=1.0):
    """Tezgah gövdesi + üst tabla + ön panel çerçevesi (panel rengi ayrı eklenir)."""
    return [
        box((0, y, height * 0.5), (width, depth, height), body),
        box((0, y, height + 0.05), (width + 0.16, depth + 0.2, 0.1), top),
        box((0, y, 0.09), (width + 0.08, depth + 0.1, 0.18), trim),
        box((0, y - depth * 0.5 - 0.02, height * 0.52), (width - 0.34, 0.07, height * 0.6), trim),
    ]


def front_badge(color, kind, y=-0.925, z=0.55, s=1.0):
    """Tezgahın önüne, oyuncunun en çok gördüğü yere amblem koyar."""
    parts = []
    yf = y - 0.045
    if kind == 'lemon':
        parts += [cyl((0, yf, z), 0.3 * s, 0.05, color, rot=(math.pi / 2, 0, 0), verts=18),
                  cyl((0, yf - 0.03, z), 0.24 * s, 0.03, material('cream2', (0.99, 0.96, 0.85)),
                      rot=(math.pi / 2, 0, 0), verts=18)]
        for i in range(6):
            a = i * math.tau / 6
            parts.append(box((math.cos(a) * 0.13 * s, yf - 0.045, z + math.sin(a) * 0.13 * s),
                             (0.16 * s, 0.03, 0.035 * s), color, rot=(0, -a, 0)))
    elif kind == 'cookie':
        parts.append(cyl((0, yf, z), 0.3 * s, 0.05, color, rot=(math.pi / 2, 0, 0), verts=16))
        for i in range(5):
            a = i * 1.3
            parts.append(sphere((math.cos(a) * 0.14 * s, yf - 0.04, z + math.sin(a) * 0.14 * s),
                                0.045 * s, material('chips', (0.28, 0.16, 0.1))))
    elif kind == 'scoop':
        parts += [cone((0, yf, z - 0.16 * s), 0.2 * s, 0.02, 0.28 * s, material('cone', (0.86, 0.66, 0.38)),
                       rot=(math.pi, 0, 0), verts=10),
                  sphere((0, yf, z + 0.14 * s), 0.2 * s, color)]
    elif kind == 'cup':
        parts += [cyl((0, yf, z), 0.22 * s, 0.34 * s, color, rot=(math.pi / 2, 0, 0), verts=14),
                  cyl((0, yf - 0.02, z + 0.06 * s), 0.19 * s, 0.16 * s, material('juice2', (1.0, 0.85, 0.4)),
                      rot=(math.pi / 2, 0, 0), verts=14)]
    elif kind == 'cake':
        parts += [cyl((0, yf, z - 0.09 * s), 0.3 * s, 0.12 * s, color, rot=(math.pi / 2, 0, 0), verts=16),
                  cyl((0, yf, z + 0.05 * s), 0.22 * s, 0.11 * s, material('cream3', (0.99, 0.95, 0.9)),
                      rot=(math.pi / 2, 0, 0), verts=16),
                  cyl((0, yf, z + 0.17 * s), 0.14 * s, 0.1 * s, color, rot=(math.pi / 2, 0, 0), verts=14),
                  sphere((0, yf - 0.02, z + 0.26 * s), 0.05 * s, material('berry2', (0.85, 0.15, 0.3)))]
    elif kind == 'donut':
        parts += [torus((0, yf, z), 0.28 * s, 0.11 * s, material('dough2', (0.86, 0.64, 0.34)),
                        rot=(math.pi / 2, 0, 0), maj_seg=18),
                  torus((0, yf - 0.02, z), 0.26 * s, 0.07 * s, color, rot=(math.pi / 2, 0, 0), maj_seg=18)]
    elif kind == 'bar':
        parts.append(box((0, yf, z), (0.5 * s, 0.05, 0.5 * s), color))
        for i in range(4):
            parts.append(box((-0.16 * s + (i % 2) * 0.32 * s, yf - 0.035, z - 0.16 * s + (i // 2) * 0.32 * s),
                             (0.3 * s, 0.03, 0.03), material('darkbar', (0.2, 0.12, 0.08))))
    elif kind == 'lolli':
        parts += [cyl((0, yf, z - 0.12 * s), 0.03 * s, 0.4 * s, material('stick', (0.95, 0.93, 0.88)),
                      verts=6),
                  cyl((0, yf - 0.02, z + 0.14 * s), 0.22 * s, 0.05, color, rot=(math.pi / 2, 0, 0), verts=16),
                  torus((0, yf - 0.05, z + 0.14 * s), 0.12 * s, 0.035, material('white2', (0.99, 0.99, 1.0)),
                        rot=(math.pi / 2, 0, 0), maj_seg=14)]
    elif kind == 'rainbow':
        parts.append(cyl((0, yf, z - 0.14 * s), 0.24 * s, 0.2 * s, color, rot=(math.pi / 2, 0, 0), verts=14))
        for i, c in enumerate([(0.94, 0.3, 0.3), (0.98, 0.62, 0.22), (0.98, 0.87, 0.3), (0.5, 0.85, 0.4)]):
            parts.append(box((0, yf - 0.03, z + (0.02 + i * 0.075) * s), (0.4 * s, 0.04, 0.06 * s),
                             material('rb%d' % i, c)))
    elif kind == 'crown':
        parts += [box((0, yf, z - 0.06 * s), (0.56 * s, 0.05, 0.2 * s), color),
                  box((0, yf, z - 0.16 * s), (0.66 * s, 0.05, 0.05 * s), color)]
        for i in range(3):
            parts.append(cone((-0.2 * s + i * 0.2 * s, yf, z + 0.22 * s),
                              0.075 * s, 0.005, 0.3 * s, color, verts=6))
        for i in range(3):
            parts.append(sphere((-0.2 * s + i * 0.2 * s, yf - 0.01, z + 0.38 * s), 0.045 * s, color))
    return parts


def awning(width, mats, pole_mat, y=-0.5, z=2.3, deep=1.5, tilt=0.26, stripes=8):
    parts = []
    sw = width / stripes
    cy, cz = math.cos(tilt), math.sin(tilt)
    for i in range(stripes):
        x = -width / 2 + sw * (i + 0.5)
        m = mats[i % len(mats)]
        parts.append(box((x, y, z), (sw * 0.99, deep, 0.055), m, rot=(tilt, 0, 0)))
        parts.append(sphere((x, y - deep * 0.5 * cy, z - deep * 0.5 * cz - 0.01),
                            sw * 0.52, m, scale=(1.0, 1.0, 0.5)))
    for s in (-1, 1):
        parts.append(cyl((s * (width / 2 - 0.03), y + deep * 0.22, z * 0.52),
                         0.055, z * 1.04, pole_mat, verts=8))
        parts.append(cyl((s * (width / 2 - 0.03), y + deep * 0.22, 0.05),
                         0.16, 0.1, pole_mat, verts=8))
    return parts


def signboard(w, h, z, board, frame, emblem_parts, y=0.28, posts=True):
    """Ön yüzü -Y olan tabela. Amblem panelin ÖNÜNE yerleşir."""
    parts = [
        box((0, y, z), (w, 0.09, h), board),
        box((0, y - 0.05, z + h / 2), (w + 0.1, 0.08, 0.07), frame),
        box((0, y - 0.05, z - h / 2), (w + 0.1, 0.08, 0.07), frame),
    ]
    for s in (-1, 1):
        parts.append(box((s * (w / 2 - 0.04), y - 0.05, z), (0.07, 0.08, h), frame))
        if posts:
            parts.append(box((s * (w / 2 - 0.3), y + 0.24, z - h / 2 - 0.35),
                             (0.07, 0.07, 0.75), frame, rot=(-0.42, 0, 0)))
    for p in emblem_parts:
        p.location.y += y - 0.085
        p.location.z += z
        parts.append(p)
    return parts


# ------------------------------------------------------------ 1 limonata
def stall_stand():
    reset()
    wood = material('wood', (0.52, 0.34, 0.18))
    wood_l = material('wood_l', (0.7, 0.49, 0.26))
    cream = material('cream', (0.98, 0.96, 0.89))
    yellow = material('yellow', (0.98, 0.8, 0.14))
    lemon = material('lemon', (1.0, 0.85, 0.12))
    metal = material('metal', (0.62, 0.64, 0.68), rough=0.3, metal=0.85)
    leaf = material('leaf_g', (0.3, 0.62, 0.26))
    parts = counter(2.8, wood, cream, wood_l)
    parts += front_badge(yellow, 'lemon', s=1.15)
    parts += awning(2.95, [yellow, cream], wood_l, y=-0.5, z=2.32)
    # limonata sürahisi
    parts += [cyl((0, -0.55, 1.3), 0.23, 0.55, yellow, verts=16),
              cyl((0, -0.55, 1.58), 0.245, 0.08, metal, verts=16),
              cyl((0, -0.55, 1.64), 0.09, 0.08, cream, verts=10),
              box((0, -0.79, 1.12), (0.07, 0.12, 0.16), metal)]
    for i in range(3):
        parts.append(cyl((-0.42 + i * 0.09, -0.66 + i * 0.03, 1.44), 0.015, 0.28, cream,
                         rot=(0.2, 0, 0.12 * (i - 1)), verts=5))
    # limon kasası
    parts += [box((0.82, -0.55, 1.22), (0.72, 0.46, 0.05), wood_l),
              box((0.46, -0.55, 1.32), (0.05, 0.46, 0.24), wood_l),
              box((1.18, -0.55, 1.32), (0.05, 0.46, 0.24), wood_l),
              box((0.82, -0.32, 1.32), (0.72, 0.05, 0.24), wood_l),
              box((0.82, -0.78, 1.32), (0.72, 0.05, 0.24), wood_l)]
    for i in range(6):
        a = i * 1.1
        parts.append(sphere((0.82 + math.cos(a) * 0.2, -0.55 + math.sin(a) * 0.12, 1.32 + (i % 2) * 0.1),
                            0.13, lemon, scale=(1, 1, 0.92), subdiv=2))
    # yaprak süsleri
    for s in (-1, 1):
        parts.append(sphere((s * 1.22, 0.02, 2.02), 0.15, leaf, scale=(1.5, 1, 1)))
    # tabela: limon dilimi
    emblem = [cyl((0, 0, 0), 0.3, 0.06, yellow, rot=(math.pi / 2, 0, 0), verts=18),
              cyl((0, -0.04, 0), 0.24, 0.04, cream, rot=(math.pi / 2, 0, 0), verts=18)]
    for i in range(6):
        a = i * math.tau / 6
        emblem.append(box((math.cos(a) * 0.13, -0.06, math.sin(a) * 0.13), (0.16, 0.03, 0.035), yellow,
                          rot=(0, -a, 0)))
    parts += signboard(1.5, 0.66, 2.98, cream, wood_l, emblem, y=0.34)
    export('stall_stand')


# ------------------------------------------------------------ 2 fırın
def stall_oven():
    reset()
    brick_a = material('brick_a', (0.58, 0.28, 0.2))
    brick_b = material('brick_b', (0.68, 0.35, 0.24))
    marble = material('marble', (0.95, 0.93, 0.88), rough=0.35)
    dark = material('dark', (0.19, 0.16, 0.14))
    glow = material('oven_fire', (1.0, 0.55, 0.15), rough=0.4, emit=(1.0, 0.45, 0.05), es=3.5)
    dough = material('dough', (0.86, 0.62, 0.32))
    choco = material('choco', (0.3, 0.18, 0.1))
    metal = material('metal', (0.4, 0.41, 0.43), rough=0.35, metal=0.75)
    parts = []
    for row in range(5):
        for col in range(4):
            x = -0.95 + col * 0.5 + (0.25 if row % 2 else 0)
            parts.append(box((x, -0.35, 0.2 + row * 0.34), (0.47, 0.92, 0.31),
                             brick_a if (row + col) % 2 else brick_b))
    parts += [box((0, -0.82, 0.68), (1.1, 0.08, 0.72), dark),
              box((0, -0.85, 0.58), (0.9, 0.05, 0.44), glow),
              box((0, -0.86, 0.86), (1.0, 0.04, 0.1), dark),
              box((0, -0.4, 1.86), (2.4, 0.95, 0.12), marble),
              box((0, -1.0, 1.82), (2.4, 0.06, 0.2), marble),
              box((0, -0.98, 1.42), (1.3, 0.06, 0.5), dark)]
    # ön amblem
    parts += front_badge(dough, 'cookie', y=-0.9, z=0.55, s=1.05)
    # baca + duman
    parts += [cyl((1.3, 0.3, 2.15), 0.2, 1.1, brick_b, verts=12),
              cyl((1.3, 0.3, 2.74), 0.26, 0.12, dark, verts=12)]
    smoke = material('smoke', (0.9, 0.9, 0.92), rough=1.0)
    for i in range(3):
        parts.append(sphere((1.3 + 0.04 * (i - 1), 0.3, 2.96 + i * 0.24), 0.18 + i * 0.05, smoke))
    # kurabiye tepsisi
    parts += [box((-0.55, -0.6, 1.96), (0.72, 0.5, 0.05), metal)]
    for i in range(4):
        x = -0.78 + (i % 2) * 0.26
        y = -0.7 + (i // 2) * 0.2
        parts += [sphere((x, y, 2.02), 0.1, dough, scale=(1, 1, 0.5), subdiv=2),
                  sphere((x, y, 2.07), 0.022, choco)]
    # ekmekler
    for i in range(3):
        parts.append(sphere((0.6, -0.66 + i * 0.16, 1.98), 0.16, dough,
                            scale=(1.6, 0.7, 0.75), subdiv=2))
    parts += awning(2.3, [brick_b, material('cream', (0.98, 0.94, 0.85))], metal,
                    y=-0.48, z=2.08, deep=0.95, tilt=0.2, stripes=6)
    emblem = [cyl((0, 0, 0), 0.28, 0.06, dough, rot=(math.pi / 2, 0, 0), verts=18)]
    for i in range(5):
        a = i * 1.3
        emblem.append(sphere((math.cos(a) * 0.13, -0.04, math.sin(a) * 0.13), 0.045, choco))
    parts += signboard(1.5, 0.6, 3.0, material('board', (0.99, 0.95, 0.86)), brick_b, emblem, y=0.3)
    export('stall_oven')


# ------------------------------------------------------------ 3 dondurma
def stall_icecream():
    reset()
    white = material('white', (0.99, 0.99, 1.0))
    pink = material('pink', (0.99, 0.5, 0.7))
    mint = material('mint', (0.5, 0.88, 0.78))
    cream = material('cream', (1.0, 0.93, 0.72))
    metal = material('metal', (0.6, 0.62, 0.66), rough=0.3, metal=0.8)
    dark = material('dark', (0.22, 0.22, 0.26))
    parts = [box((0, -0.35, 0.82), (2.5, 0.95, 0.86), white),
             box((0, -0.35, 1.3), (2.62, 1.06, 0.08), metal),
             box((0, -0.84, 0.82), (2.5, 0.06, 0.52), pink),
             box((0, -0.84, 0.82), (1.1, 0.06, 0.42), white),
             box((0, -0.35, 1.56), (1.4, 0.75, 0.34), material('glass', (0.75, 0.9, 0.94), rough=0.15)),
             box((0, -0.4, 1.55), (1.2, 0.55, 0.26), material('freezer', (0.6, 0.88, 0.98)))]
    parts += front_badge(pink, 'scoop', y=-0.835, z=0.52, s=1.15)
    for s in (-1, 1):
        parts.append(torus((s * 0.95, -0.2, 0.3), 0.3, 0.08, dark, rot=(0, math.pi / 2, 0), maj_seg=14))
        for k in range(4):
            a = k * math.pi / 2
            parts.append(box((s * 0.95, -0.2 + math.cos(a) * 0.15, 0.3 + math.sin(a) * 0.15),
                             (0.04, 0.24, 0.03), metal))
    # şemsiye
    parts += [cyl((0, 0.1, 1.9), 0.045, 2.0, metal, verts=8),
              cone_striped((0, 0.1, 2.95), 1.4, 0.06, 0.52, [pink, white], verts=16),
              sphere((0, 0.1, 3.25), 0.07, metal)]
    # külah + toplar (tentenin altında kalır)
    for i in range(4):
        x = -0.55 + i * 0.36
        parts += [cone((x, -0.62, 1.55), 0.11, 0.03, 0.28, cream, rot=(math.pi, 0, 0), verts=10),
                  sphere((x, -0.62, 1.72), 0.12, [pink, mint, cream][i % 3], subdiv=2)]
    emblem = [cone((0, 0, -0.07), 0.2, 0.02, 0.3, cream, rot=(math.pi, 0, 0), verts=12),
              sphere((0, 0, 0.16), 0.18, pink),
              sphere((0, 0.01, 0.32), 0.12, mint)]
    parts += signboard(1.5, 0.62, 3.42, material('board', (0.99, 0.97, 0.93)), pink, emblem, y=0.4)
    export('stall_icecream')


# ------------------------------------------------------------ 4 meyve suyu
def stall_juice():
    reset()
    purple = material('purple', (0.6, 0.4, 0.9))
    white = material('white', (0.98, 0.98, 1.0))
    wood = material('wood', (0.46, 0.32, 0.19))
    metal = material('metal', (0.6, 0.62, 0.66), rough=0.3, metal=0.85)
    lime = material('jlime', (0.52, 0.84, 0.28), rough=0.35)
    orange = material('jorange', (1.0, 0.58, 0.1), rough=0.35)
    red = material('jberry', (0.92, 0.22, 0.34), rough=0.35)
    fruit = material('fruit', (1.0, 0.6, 0.12))
    leaf = material('leaf', (0.35, 0.68, 0.3))
    parts = counter(2.8, wood, white, purple, height=1.06)
    parts += front_badge(purple, 'cup', s=1.15)
    parts += awning(2.95, [purple, white], wood, y=-0.5, z=2.36)
    for i, jm in enumerate([lime, orange, red]):
        x = -0.8 + i * 0.62
        parts += [cyl((x, -0.5, 1.62), 0.19, 0.5, metal, verts=16),
                  cyl((x, -0.5, 1.54), 0.16, 0.34, jm, verts=16),
                  cyl((x, -0.5, 1.9), 0.2, 0.08, material('lid', (0.92, 0.92, 0.94)), verts=16),
                  box((x, -0.69, 1.3), (0.06, 0.12, 0.12), metal)]
    for i in range(6):
        a = i * 1.05
        parts.append(sphere((1.02 + math.cos(a) * 0.16, -0.6 + math.sin(a) * 0.13, 1.3 + (i % 2) * 0.12),
                            0.13, fruit, subdiv=2))
    parts += [sphere((1.02, -0.6, 1.5), 0.11, fruit),
              sphere((1.02, -0.6, 1.6), 0.045, leaf)]
    # menü panosu (tezgahın arkasında)
    parts += [box((-0.3, 0.3, 2.62), (1.2, 0.07, 0.66), material('board', (0.2, 0.17, 0.22))),
              box((-0.3, 0.26, 2.68), (0.9, 0.04, 0.06), white)]
    for i in range(3):
        parts.append(box((-0.55 + i * 0.12, 0.25, 2.5 + i * 0.1), (0.45, 0.03, 0.05),
                         [lime, orange, red][i]))
    for i in range(4):
        parts.append(cyl((0.95, -0.36, 1.14 + i * 0.05), 0.09, 0.12, white, verts=10))
    emblem = [cyl((0, 0, 0), 0.22, 0.06, purple, rot=(math.pi / 2, 0, 0), verts=14),
              cyl((0, -0.03, 0.03), 0.17, 0.04, orange, rot=(math.pi / 2, 0, 0), verts=14),
              box((0.02, -0.05, 0.28), (0.04, 0.03, 0.3), white, rot=(0.25, 0, 0))]
    parts += signboard(1.5, 0.62, 3.24, white, purple, emblem, y=0.34)
    export('stall_juice')


# ------------------------------------------------------------ 5 pasta
def stall_cake():
    reset()
    cream = material('cream', (0.99, 0.95, 0.9))
    pink = material('pink', (0.98, 0.66, 0.78))
    gold = material('gold', (0.95, 0.76, 0.3), rough=0.25, metal=0.9)
    choco = material('choco', (0.4, 0.24, 0.15))
    berry = material('berry', (0.85, 0.16, 0.3))
    white = material('white', (0.99, 0.99, 1.0))
    parts = counter(2.9, cream, white, gold, height=1.0)
    parts += front_badge(pink, 'cake', s=1.15)
    parts += awning(3.0, [pink, cream], gold, y=-0.5, z=2.34, stripes=9)
    # katlı pasta
    parts += [cyl((0, -0.45, 1.2), 0.34, 0.05, white, verts=20),
              cyl((0, -0.45, 1.3), 0.32, 0.18, choco, verts=20),
              cyl((0, -0.45, 1.42), 0.26, 0.16, cream, verts=20),
              cyl((0, -0.45, 1.53), 0.2, 0.14, pink, verts=20),
              cyl((0, -0.45, 1.63), 0.13, 0.12, cream, verts=18),
              torus((0, -0.45, 1.7), 0.12, 0.04, gold, maj_seg=14),
              sphere((0, -0.45, 1.79), 0.07, berry)]
    # cupcake tepsisi
    parts += [box((0.85, -0.5, 1.03), (0.75, 0.55, 0.06), gold)]
    for i in range(3):
        x = 0.6 + i * 0.24
        parts += [cone((x, -0.55, 1.13), 0.1, 0.13, 0.16, pink, verts=12),
                  sphere((x, -0.55, 1.26), 0.11, cream, scale=(1, 1, 0.8)),
                  sphere((x, -0.55, 1.33), 0.035, berry)]
    # kek standı
    parts += [cyl((-0.95, -0.5, 1.16), 0.24, 0.04, gold, verts=18),
              cyl((-0.95, -0.5, 1.07), 0.06, 0.16, gold, verts=10),
              cyl((-0.95, -0.5, 1.22), 0.2, 0.14, cream, verts=18),
              sphere((-0.95, -0.5, 1.31), 0.05, berry)]
    emblem = [cyl((0, 0, -0.09), 0.25, 0.12, choco, verts=16),
              cyl((0, 0, 0.04), 0.19, 0.12, cream, verts=16),
              cyl((0, 0, 0.16), 0.13, 0.1, pink, verts=14),
              sphere((0, 0, 0.24), 0.05, berry)]
    parts += signboard(1.6, 0.66, 3.22, cream, gold, emblem, y=0.38)
    export('stall_cake')


# ------------------------------------------------------------ 6 donut
def stall_donut():
    reset()
    cream = material('cream', (0.99, 0.95, 0.9))
    pink = material('pink', (0.99, 0.5, 0.7))
    choco = material('choco', (0.45, 0.26, 0.16))
    dough = material('dough', (0.85, 0.62, 0.33))
    blue = material('blue', (0.4, 0.72, 0.98))
    metal = material('metal', (0.62, 0.64, 0.68), rough=0.3, metal=0.8)
    parts = counter(2.9, cream, cream, pink, height=1.0)
    parts += front_badge(pink, 'donut', s=1.2)
    parts += awning(3.0, [pink, cream], metal, y=-0.5, z=2.28, stripes=6)
    # donut kulesi (tezgah üstünde)
    for i in range(5):
        r = 0.3 - i * 0.025
        parts += [torus((0, -0.45, 1.18 + i * 0.17), r, 0.1, dough, maj_seg=16),
                  torus((0, -0.45, 1.22 + i * 0.17), r * 0.96, 0.068,
                        pink if i % 2 == 0 else choco, maj_seg=16)]
    # vitrin
    parts += [box((0.85, -0.45, 1.34), (0.82, 0.58, 0.56), material('glass2', (0.82, 0.93, 0.97), rough=0.12)),
              box((0.85, -0.45, 1.03), (0.88, 0.62, 0.06), metal)]
    for i in range(3):
        parts.append(torus((0.72 + i * 0.15, -0.56, 1.42), 0.11, 0.045,
                           [pink, choco, blue][i], rot=(math.pi / 2, 0, 0), maj_seg=14))
    # sos şişeleri
    for i, m in enumerate([pink, choco, blue]):
        x = -0.95 + i * 0.2
        parts += [cyl((x, -0.36, 1.26), 0.07, 0.2, m, verts=10),
                  cone((x, -0.36, 1.39), 0.07, 0.02, 0.1, metal, verts=8)]
    # dev donut tabelası
    parts += [torus((0, 0.3, 2.95), 0.58, 0.18, dough, maj_seg=22),
              torus((0, 0.26, 2.97), 0.56, 0.13, pink, maj_seg=22),
              sphere((0.28, 0.12, 3.16), 0.05, blue),
              sphere((-0.2, 0.1, 3.24), 0.045, cream),
              sphere((0.08, 0.1, 2.72), 0.05, blue)]
    for s in (-1, 1):
        parts.append(box((s * 1.05, 0.34, 2.55), (0.06, 0.06, 1.0), metal, rot=(-0.18, 0, 0)))
    export('stall_donut')


# ------------------------------------------------------------ 7 çikolata
def stall_choco():
    reset()
    dark = material('dark_steel', (0.24, 0.22, 0.25), rough=0.35, metal=0.8)
    gold = material('gold', (0.93, 0.73, 0.26), rough=0.25, metal=0.95)
    choco = material('choco', (0.32, 0.18, 0.1), rough=0.45)
    choco_l = material('choco_l', (0.55, 0.33, 0.18), rough=0.45)
    glow = material('vent', (1.0, 0.7, 0.25), emit=(1.0, 0.55, 0.1), es=2.2, rough=0.5)
    parts = [box((0, -0.35, 0.85), (2.9, 1.0, 1.0), dark),
             box((0, -0.35, 1.38), (3.0, 1.12, 0.1), gold),
             box((0, -0.86, 0.82), (2.9, 0.05, 0.6), choco)]
    parts += front_badge(gold, 'bar', y=-0.85, z=0.55, s=1.1)
    # borular (tabelanın iki yanında)
    parts += [cyl((1.18, 0.45, 1.9), 0.1, 2.0, dark, verts=10),
              cyl((1.18, 0.45, 2.92), 0.1, 0.9, dark, rot=(0, math.pi / 2, 0), verts=10),
              sphere((0.78, 0.45, 2.92), 0.12, dark),
              cyl((-1.18, 0.45, 2.35), 0.09, 1.4, gold, verts=10),
              sphere((-1.18, 0.45, 3.05), 0.12, gold),
              box((-0.8, 0.5, 2.3), (0.42, 0.42, 0.42), dark),
              box((-0.8, 0.5, 2.53), (0.34, 0.34, 0.04), glow)]
    # çikolata çeşmesi
    parts += [cyl((0, -0.45, 1.52), 0.4, 0.12, gold, verts=18),
              cyl((0, -0.45, 1.7), 0.28, 0.26, choco, verts=18),
              cyl((0, -0.45, 1.94), 0.17, 0.22, choco_l, verts=16),
              cone((0, -0.45, 2.14), 0.15, 0.02, 0.24, choco, verts=14)]
    for i in range(4):
        a = i * 1.57
        parts.append(cone((math.cos(a) * 0.32, -0.45 + math.sin(a) * 0.32, 1.68),
                          0.045, 0.01, 0.26, choco, verts=6))
    # konveyör
    parts += [box((0.95, -0.55, 1.2), (0.82, 0.48, 0.1), dark),
              box((0.95, -0.55, 1.26), (0.82, 0.44, 0.04), material('belt', (0.17, 0.16, 0.18)))]
    for i in range(4):
        parts.append(box((0.64 + i * 0.19, -0.55, 1.31), (0.12, 0.15, 0.06), choco))
    emblem = [torus((0, 0, 0), 0.22, 0.06, gold, rot=(math.pi / 2, 0, 0), maj_seg=16)]
    for i in range(8):
        a = i * math.tau / 8
        emblem.append(box((math.cos(a) * 0.28, -0.02, math.sin(a) * 0.28), (0.09, 0.05, 0.08), gold,
                          rot=(0, -a, 0)))
    emblem.append(cyl((0, -0.03, 0), 0.1, 0.07, choco, rot=(math.pi / 2, 0, 0), verts=12))
    parts += signboard(1.7, 0.7, 3.16, material('board', (0.17, 0.15, 0.18)), gold, emblem, y=0.55)
    export('stall_choco')


# ------------------------------------------------------------ 8 şeker
def stall_candy():
    reset()
    mint = material('mint', (0.45, 0.9, 0.8))
    pink = material('pink', (0.99, 0.45, 0.68))
    yellow = material('yellow', (0.99, 0.83, 0.25))
    white = material('white', (0.99, 0.99, 1.0))
    purple = material('purple', (0.68, 0.42, 0.94))
    red = material('red', (0.95, 0.22, 0.28))
    wood = material('wood', (0.5, 0.34, 0.2))
    parts = counter(2.9, pink, white, mint, height=0.98)
    parts += front_badge(mint, 'lolli', s=1.2)
    parts += awning(3.0, [mint, pink], wood, y=-0.5, z=2.3, stripes=8)
    # tezgah üstü lolipoplar (tentenin altında)
    for i, m in enumerate([yellow, purple, mint]):
        x = -0.9 + i * 0.28
        parts += [cyl((x, -0.35, 1.3), 0.03, 0.5, white, verts=6),
                  cyl((x, -0.35, 1.62), 0.19, 0.06, m, rot=(math.pi / 2, 0, 0), verts=14),
                  torus((x, -0.4, 1.62), 0.1, 0.03, white, rot=(math.pi / 2, 0, 0), maj_seg=12)]
    # şeker kavanozları
    for i, m in enumerate([pink, yellow, mint]):
        x = 0.0 + i * 0.3
        parts += [cyl((x, -0.62, 1.28), 0.15, 0.3, material('jar', (0.88, 0.95, 0.97), rough=0.2), verts=14),
                  cyl((x, -0.62, 1.45), 0.16, 0.06, white, verts=14),
                  cone((x, -0.62, 1.52), 0.13, 0.11, 0.08, m, verts=12)]
        for k in range(4):
            a = k * 1.5
            parts.append(sphere((x + math.cos(a) * 0.07, -0.62 + math.sin(a) * 0.07, 1.22 + (k % 2) * 0.08),
                                0.05, m))
    # şeker kamışı sütunlar (tentenin dışında)
    for s in (-1, 1):
        for k in range(6):
            parts.append(cyl((s * 1.55, 0.15, 0.2 + k * 0.3), 0.085, 0.28,
                             white if k % 2 else red, verts=10))
        parts += [torus((s * 1.55, 0.15, 1.98), 0.17, 0.06, white, rot=(0, math.pi / 2, 0), maj_seg=12),
                  torus((s * 1.55, 0.15, 1.98), 0.17, 0.06, red, rot=(math.pi / 2, 0, 0), maj_seg=12)]
    emblem = [cyl((0, 0, 0), 0.22, 0.06, pink, rot=(math.pi / 2, 0, 0), verts=14),
              torus((0, -0.04, 0), 0.11, 0.035, white, rot=(math.pi / 2, 0, 0), maj_seg=12)]
    for s in (-1, 1):
        emblem.append(box((s * 0.3, 0, 0), (0.2, 0.06, 0.13), purple, rot=(0, 0, s * 0.45)))
    parts += signboard(1.6, 0.66, 3.18, white, mint, emblem, y=0.36)
    export('stall_candy')


# ------------------------------------------------------------ 9 gökkuşağı kafe
def stall_rainbow():
    reset()
    cream = material('cream', (0.98, 0.97, 0.93))
    wood = material('wood', (0.5, 0.34, 0.2))
    metal = material('metal', (0.6, 0.62, 0.66), rough=0.3, metal=0.85)
    cols = [material('r1', (0.94, 0.3, 0.3)), material('r2', (0.98, 0.6, 0.2)),
            material('r3', (0.97, 0.85, 0.28)), material('r4', (0.48, 0.84, 0.38)),
            material('r5', (0.32, 0.68, 0.95)), material('r6', (0.6, 0.42, 0.92))]
    parts = counter(2.8, cream, wood, metal, height=1.0)
    parts += front_badge(cols[4], 'rainbow', s=1.15)
    for i, m in enumerate(cols):
        parts.append(torus((0, 0.05, 1.3), 1.5 - i * 0.1, 0.055, m, rot=(math.pi / 2, 0, 0), maj_seg=24))
    parts += [box((0, 0.05, 1.18), (3.3, 0.1, 0.3), cream),
              box((0, 0.05, 1.0), (3.3, 0.13, 0.1), wood)]
    # espresso makinesi
    parts += [box((0.78, -0.4, 1.3), (0.55, 0.46, 0.44), metal),
              box((0.78, -0.65, 1.26), (0.4, 0.05, 0.28), material('dark', (0.16, 0.15, 0.18))),
              cyl((0.78, -0.4, 1.57), 0.12, 0.14, metal, verts=12),
              cyl((0.5, -0.62, 1.12), 0.09, 0.16, cream, verts=10)]
    for i in range(4):
        parts.append(cyl((-0.8 + (i % 2) * 0.16, -0.36 + (i // 2) * 0.16, 1.06 + (i // 2) * 0.1),
                         0.08, 0.18, cream, verts=10))
    # masalar (tezgahın yanında)
    for s in (-1, 1):
        x = s * 1.95
        parts += [cyl((x, -1.75, 0.7), 0.4, 0.06, wood, verts=16),
                  cyl((x, -1.75, 0.37), 0.06, 0.66, metal, verts=8),
                  cyl((x, -1.75, 0.04), 0.25, 0.05, metal, verts=12),
                  box((x + s * 0.5, -1.75, 0.44), (0.34, 0.34, 0.05), cols[4]),
                  box((x + s * 0.5, -1.9, 0.7), (0.34, 0.05, 0.48), cols[4])]
    # saksılar
    for s in (-1, 1):
        parts += [cone((s * 1.16, -0.1, 1.96), 0.16, 0.22, 0.3, material('pot', (0.78, 0.48, 0.33)), verts=10),
                  sphere((s * 1.16, -0.1, 2.18), 0.2, cols[3])]
    export('stall_rainbow')


# ------------------------------------------------------------ 10 krallık
def stall_castle():
    reset()
    stone = material('stone', (0.85, 0.8, 0.9))
    stone_d = material('stone_d', (0.7, 0.63, 0.82))
    gold = material('gold', (0.96, 0.78, 0.32), rough=0.22, metal=0.95)
    pink = material('pink', (0.98, 0.42, 0.68))
    magenta = material('magenta', (0.84, 0.24, 0.6))
    white = material('white', (0.99, 0.98, 1.0))
    win = material('win', (1.0, 0.86, 0.4), emit=(1.0, 0.72, 0.25), es=1.6, rough=0.4)
    parts = [box((0, -0.35, 0.78), (2.5, 0.95, 0.9), stone),
             box((0, -0.35, 1.26), (2.82, 1.1, 0.12), material('top', (0.99, 0.95, 0.88))),
             box((0, -0.35, 1.33), (2.86, 1.14, 0.05), gold),
             box((0, -0.82, 0.78), (2.3, 0.06, 0.52), magenta)]
    parts += front_badge(gold, 'crown', y=-0.82, z=0.56, s=1.15)
    # kuleler
    for s in (-1, 1):
        x = s * 1.02
        parts += [cyl((x, 0.1, 1.55), 0.4, 2.1, stone, verts=12),
                  cyl((x, 0.1, 2.62), 0.48, 0.14, gold, verts=12),
                  cone_striped((x, 0.1, 3.12), 0.53, 0.02, 0.9, [pink, white], verts=12),
                  sphere((x, 0.1, 3.6), 0.08, gold)]
        for k in range(2):
            parts.append(box((x - 0.12 + k * 0.24, -0.28, 2.4), (0.11, 0.06, 0.24), win))
        parts.append(box((x, -0.3, 1.85), (0.24, 0.06, 0.44), win))
    # kraliyet pastası + şamdanlar (tezgah üstü)
    parts += [cyl((0, -0.5, 1.42), 0.36, 0.05, gold, verts=18),
              cyl((0, -0.5, 1.52), 0.3, 0.18, material('royal', (0.95, 0.85, 0.95)), verts=18),
              cyl((0, -0.5, 1.63), 0.22, 0.14, magenta, verts=16),
              cyl((0, -0.5, 1.72), 0.14, 0.12, gold, verts=14),
              sphere((0, -0.5, 1.82), 0.06, white)]
    for s in (-1, 1):
        parts += [cyl((s * 0.95, -0.55, 1.5), 0.06, 0.34, gold, verts=10),
                  cyl((s * 0.95, -0.55, 1.7), 0.09, 0.05, gold, verts=10),
                  cone((s * 0.95, -0.55, 1.8), 0.045, 0.01, 0.14, white, verts=6)]
    # flamalar
    for s in (-1, 1):
        parts += [cyl((s * 1.5, 0.1, 1.2), 0.03, 1.0, gold, verts=6),
                  box((s * 1.5 + s * 0.2, 0.1, 1.5), (0.4, 0.04, 0.32), pink),
                  cone((s * 1.5 + s * 0.2, 0.1, 1.3), 0.22, 0.01, 0.18, pink,
                       rot=(math.pi, 0, 0), verts=4)]
    export('stall_castle')


stall_stand()
stall_oven()
stall_icecream()
stall_juice()
stall_cake()
stall_donut()
stall_choco()
stall_candy()
stall_rainbow()
stall_castle()
print('ALL STALLS DONE')

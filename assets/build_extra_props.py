# Tatlı Tycoon — ek prop seti (Blender headless).
# Kullanım:  blender.exe -b -P assets/build_extra_props.py
# Çıktı:     assets/props/*.glb  (pet_cat, pet_dog, pet_bunny, pet_dragon,
#            pet_unicorn, kiosk, balloon_arch, fountain_big, crate_stack, flower_bed)
#
# Yön: tezgahlarla aynı — Blender Z-up, ön yüz -Y; export_yup=True.
# Ölçü: 1 birim = 1 metre, zemin z=0.

import bpy
import math
import os
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'props')
os.makedirs(OUT, exist_ok=True)


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


def sphere(loc, radius, mat, scale=(1, 1, 1), subdiv=2):
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


def join_parts(name, parts):
    objs = [o for o in parts if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
    except Exception:
        pass
    return obj


def export(name, objs=None):
    objs = objs or [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_apply=True, export_yup=True,
    )
    tris = 0
    for o in objs:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    xs, ys, zs = [], [], []
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            xs.append(p.x)
            ys.append(p.y)
            zs.append(p.z)
    print('%s OK %d tris %d B' % (name, tris, os.path.getsize(path)))
    print('  dims x %.2f y %.2f z %.2f (min z %.3f)' % (max(xs) - min(xs), max(ys) - min(ys),
                                                        max(zs) - min(zs), min(zs)))


# ------------------------------------------------------------ 1 kedi
def pet_cat():
    reset()
    fur = material('fur', (0.95, 0.62, 0.32))
    cream = material('fur_cream', (0.99, 0.9, 0.72))
    pink = material('pink', (0.98, 0.55, 0.65))
    dark = material('eye', (0.08, 0.07, 0.09), rough=0.25)
    parts = [
        sphere((0, 0, 0.15), 0.14, fur, scale=(1, 0.92, 1.08)),
        sphere((0, -0.095, 0.15), 0.09, cream, scale=(1, 0.5, 0.9), subdiv=1),
        sphere((0, -0.01, 0.345), 0.165, fur, scale=(1, 0.95, 0.92)),
    ]
    for s in (-1, 1):
        parts += [
            cone((s * 0.095, -0.01, 0.47), 0.055, 0.008, 0.1, fur, rot=(0, s * 0.3, 0), verts=8),
            cone((s * 0.095, -0.045, 0.468), 0.03, 0.004, 0.07, pink, rot=(0, s * 0.3, 0), verts=6),
            sphere((s * 0.062, -0.155, 0.36), 0.026, dark, subdiv=1),
            sphere((s * 0.07, -0.1, 0.045), 0.045, cream, scale=(1, 1.4, 0.9), subdiv=1),
        ]
    parts += [
        sphere((0, -0.163, 0.322), 0.021, pink, subdiv=1),
        torus((0.13, 0.1, 0.125), 0.085, 0.026, fur, rot=(math.pi / 2, 0, 0.6), maj_seg=14, min_seg=5),
    ]
    join_parts('pet_cat', parts)
    export('pet_cat')


# ------------------------------------------------------------ 2 köpek
def pet_dog():
    reset()
    fur = material('fur', (0.7, 0.45, 0.26))
    cream = material('fur_cream', (0.97, 0.88, 0.7))
    dark = material('eye', (0.08, 0.07, 0.09), rough=0.25)
    red = material('collar', (0.92, 0.25, 0.28))
    parts = [
        sphere((0, 0, 0.155), 0.145, fur, scale=(1, 0.95, 1.05)),
        sphere((0, -0.1, 0.14), 0.08, cream, scale=(1, 0.5, 1.0), subdiv=1),
        sphere((0, -0.01, 0.39), 0.175, fur, scale=(1, 0.95, 0.95)),
        sphere((0, -0.15, 0.355), 0.07, cream, scale=(1, 1.1, 0.75)),
        sphere((0, -0.225, 0.375), 0.028, dark, subdiv=1),
        torus((0, -0.01, 0.26), 0.105, 0.02, red, maj_seg=14, min_seg=4),
    ]
    for s in (-1, 1):
        parts += [
            sphere((s * 0.155, -0.02, 0.37), 0.055, fur, scale=(0.55, 1, 1.9)),
            sphere((s * 0.068, -0.15, 0.42), 0.025, dark, subdiv=1),
            sphere((s * 0.075, -0.095, 0.045), 0.05, cream, scale=(1, 1.35, 0.85), subdiv=1),
        ]
    parts.append(cone((0, 0.13, 0.27), 0.035, 0.012, 0.16, fur, rot=(-0.6, 0, 0), verts=8))
    join_parts('pet_dog', parts)
    export('pet_dog')


# ------------------------------------------------------------ 3 tavşan
def pet_bunny():
    reset()
    fur = material('fur', (0.96, 0.93, 0.99))
    pink = material('pink', (0.98, 0.56, 0.68))
    dark = material('eye', (0.08, 0.07, 0.09), rough=0.25)
    parts = [
        sphere((0, 0, 0.13), 0.12, fur, scale=(1, 1, 1.05)),
        sphere((0, -0.005, 0.31), 0.14, fur, scale=(1, 0.95, 0.95)),
        sphere((0, 0.115, 0.12), 0.05, fur, subdiv=1),
    ]
    for s in (-1, 1):
        ear = sphere((s * 0.055, 0.0, 0.475), 0.042, fur, scale=(1, 0.72, 3.3))
        ear.rotation_euler = (0, s * 0.12, 0)
        inner = sphere((s * 0.055, -0.028, 0.475), 0.022, pink, scale=(1, 0.5, 3.0), subdiv=1)
        inner.rotation_euler = (0, s * 0.12, 0)
        parts += [
            ear, inner,
            sphere((s * 0.055, -0.122, 0.33), 0.022, dark, subdiv=1),
            sphere((s * 0.055, -0.075, 0.04), 0.04, fur, scale=(1, 1.4, 0.9), subdiv=1),
        ]
    parts.append(sphere((0, -0.14, 0.295), 0.018, pink, subdiv=1))
    join_parts('pet_bunny', parts)
    export('pet_bunny')


# ------------------------------------------------------------ 4 ejderha
def pet_dragon():
    reset()
    body = material('body', (0.4, 0.8, 0.55))
    belly = material('belly', (0.95, 0.92, 0.6))
    horn = material('horn', (0.97, 0.9, 0.68))
    wing = material('wing', (0.32, 0.68, 0.45))
    dark = material('eye', (0.08, 0.07, 0.09), rough=0.25)
    parts = [
        sphere((0, 0, 0.16), 0.14, body, scale=(1, 0.95, 1.08)),
        sphere((0, -0.09, 0.14), 0.09, belly, scale=(1, 0.5, 0.9), subdiv=1),
        sphere((0, -0.01, 0.40), 0.155, body, scale=(1, 0.98, 0.9)),
        sphere((0, -0.135, 0.365), 0.07, belly, scale=(1, 1.1, 0.75)),
        cone((0, 0.02, 0.585), 0.035, 0.004, 0.16, horn, verts=6),
        cone((0, 0.19, 0.12), 0.05, 0.006, 0.32, body, rot=(-1.35, 0, 0), verts=8),
    ]
    for s in (-1, 1):
        w = cone((s * 0.14, 0.1, 0.44), 0.13, 0.01, 0.26, wing, rot=(-0.5, s * 0.7, 0), verts=5)
        w.scale = (1, 0.16, 1)
        parts += [
            w,
            cone((s * 0.06, 0.03, 0.55), 0.028, 0.004, 0.11, horn, rot=(0, s * 0.45, 0), verts=6),
            sphere((s * 0.07, -0.14, 0.43), 0.026, dark, subdiv=1),
            sphere((s * 0.06, -0.075, 0.045), 0.045, body, scale=(1, 1.3, 0.9), subdiv=1),
        ]
    for i, z in enumerate((0.29, 0.41)):
        parts.append(cone((0, 0.08 - i * 0.025, z), 0.025, 0.003, 0.09, horn,
                          rot=(-0.35, 0, 0), verts=5))
    join_parts('pet_dragon', parts)
    export('pet_dragon')


# ------------------------------------------------------------ 5 tek boynuzlu at
def pet_unicorn():
    reset()
    coat = material('coat', (0.98, 0.95, 0.98))
    cream = material('muzzle', (0.98, 0.88, 0.82))
    gold = material('gold', (0.95, 0.76, 0.3), rough=0.25, metal=0.9)
    dark = material('eye', (0.08, 0.07, 0.09), rough=0.25)
    pink = material('pink', (0.98, 0.55, 0.68))
    mint = material('mint', (0.55, 0.9, 0.8))
    yellow = material('yellow', (0.99, 0.83, 0.3))
    parts = [
        sphere((0, 0, 0.16), 0.145, coat, scale=(1, 0.95, 1.08)),
        sphere((0, -0.02, 0.40), 0.15, coat, scale=(1, 0.95, 0.95)),
        sphere((0, -0.15, 0.365), 0.065, cream, scale=(1, 1.15, 0.8)),
        cone((0, -0.05, 0.615), 0.028, 0.004, 0.18, gold, rot=(-0.25, 0, 0), verts=8),
        sphere((0, -0.21, 0.355), 0.016, pink, subdiv=1),
    ]
    # altın boynuz halkaları (spiral görünümü için kademeli)
    for t, r in ((0.35, 0.022), (0.55, 0.017), (0.75, 0.012)):
        parts.append(torus((0, -0.0722 + t * 0.0445, 0.5278 + t * 0.1744), r, 0.005, gold,
                           rot=(-0.25, 0, 0), maj_seg=10, min_seg=4))
    for i, (y, z, m) in enumerate(((0.12, 0.50, pink), (0.155, 0.43, mint),
                                   (0.165, 0.36, yellow), (0.155, 0.29, pink))):
        parts.append(sphere((0, y, z), 0.06, m, scale=(0.85, 1, 1.1)))
    for s in (-1, 1):
        parts += [
            cone((s * 0.07, -0.02, 0.56), 0.035, 0.004, 0.09, coat, rot=(0, s * 0.5, 0), verts=6),
            sphere((s * 0.065, -0.148, 0.43), 0.024, dark, subdiv=1),
            sphere((s * 0.06, -0.08, 0.045), 0.045, cream, scale=(1, 1.3, 0.9), subdiv=1),
        ]
    for i, m in enumerate((pink, mint, yellow)):
        parts.append(sphere((0, 0.155 + i * 0.02, 0.19 - i * 0.05), 0.05, m,
                            scale=(0.8, 0.7, 1.5)))
    join_parts('pet_unicorn', parts)
    export('pet_unicorn')


# ------------------------------------------------------------ 6 kiosk / görev panosu
def kiosk():
    reset()
    wood = material('wood', (0.55, 0.35, 0.18))
    wood_l = material('wood_l', (0.72, 0.5, 0.26))
    cream = material('cream', (0.98, 0.95, 0.87))
    face = material('board_face', (0.97, 0.95, 0.9), rough=0.9)
    green = material('green', (0.42, 0.78, 0.45))
    parts = []
    for s in (-1, 1):
        parts += [cyl((s * 0.62, 0, 1.0), 0.055, 2.0, wood, verts=10),
                  cyl((s * 0.62, 0, 0.05), 0.16, 0.1, wood_l, verts=10)]
    parts += [
        box((0, 0, 2.03), (1.6, 0.3, 0.14), green),
        box((0, 0, 2.12), (1.7, 0.34, 0.05), cream),
        sphere((0, 0, 2.185), 0.055, cream, subdiv=1),
        box((0, 0.06, 1.30), (1.3, 0.08, 1.0), wood_l),
        box((0, 0.03, 1.85), (1.44, 0.14, 0.09), green),
        box((0, 0.03, 0.75), (1.44, 0.14, 0.09), green),
    ]
    for s in (-1, 1):
        parts.append(box((s * 0.675, 0.03, 1.30), (0.09, 0.14, 1.09), green))
    body = join_parts('kiosk', parts)
    # pano yüzü ayrı mesh: oyun canvas dokusunu buna atayabilir
    board = join_parts('kiosk_board', [box((0, -0.005, 1.30), (1.24, 0.05, 0.92), face)])
    export('kiosk', [body, board])


# ------------------------------------------------------------ 7 balon kemeri
def balloon_arch():
    reset()
    mats = [material('b%d' % i, c) for i, c in enumerate([
        (0.99, 0.45, 0.62), (0.99, 0.82, 0.24), (0.45, 0.86, 0.72),
        (0.36, 0.66, 0.96), (0.68, 0.44, 0.92), (0.99, 0.6, 0.2)])]
    knot = material('knot', (0.95, 0.95, 0.97))
    parts = []
    n = 15
    for i in range(n):
        a = math.pi * i / (n - 1)
        x = math.cos(a) * 1.8
        z = math.sin(a) * 1.8 + 0.30
        parts.append(sphere((x, 0, z), 0.23, mats[i % len(mats)], scale=(1, 1, 1.12)))
        parts.append(cone((x, 0, z - 0.27), 0.012, 0.03, 0.04, knot,
                          rot=(math.pi, 0, 0), verts=5))
    join_parts('balloon_arch', parts)
    export('balloon_arch')


# ------------------------------------------------------------ 8 büyük fıskiye
def fountain_big():
    reset()
    stone = material('stone', (0.91, 0.88, 0.82))
    stone_d = material('stone_d', (0.78, 0.74, 0.68))
    water = material('water', (0.24, 0.68, 0.96), rough=0.12)
    foam = material('foam', (0.92, 0.98, 1.0), rough=0.5)
    gold = material('gold', (0.95, 0.76, 0.3), rough=0.3, metal=0.8)
    parts = [
        cyl((0, 0, 0.225), 3.0, 0.45, stone, verts=28),
        cyl((0, 0, 0.49), 3.04, 0.08, stone_d, verts=28),
        cyl((0, 0, 0.465), 2.82, 0.05, water, verts=28),
        cyl((0, 0, 0.85), 0.45, 0.9, stone, verts=16),
        cyl((0, 0, 1.34), 1.15, 0.12, stone_d, verts=20),
        cyl((0, 0, 1.415), 1.02, 0.04, water, verts=20),
        cyl((0, 0, 1.66), 0.22, 0.5, stone, verts=14),
        cyl((0, 0, 1.94), 0.6, 0.09, stone_d, verts=16),
        cyl((0, 0, 1.995), 0.5, 0.03, water, verts=16),
        sphere((0, 0, 2.08), 0.13, stone),
        torus((0, 0, 0.5), 0.55, 0.05, foam, maj_seg=18, min_seg=5),
    ]
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        parts.append(cyl((math.cos(a) * 0.34, math.sin(a) * 0.34, 2.18), 0.022, 0.28, water,
                         rot=(-0.45 * math.sin(a), 0.45 * math.cos(a), 0), verts=6))
        parts.append(sphere((math.cos(a) * 2.72, math.sin(a) * 2.72, 0.565), 0.07, gold, subdiv=1))
    join_parts('fountain_big', parts)
    export('fountain_big')


# ------------------------------------------------------------ 9 kasa yığını
def crate_parts(size, wood, wood_l):
    s = size
    t = s * 0.075
    parts = [box((0, 0, 0), (s * 0.94, s * 0.94, s * 0.94), wood)]
    for y in (-s / 2, s / 2):
        for z in (-s / 2, s / 2):
            parts.append(box((0, y, z), (s, t, t), wood_l))
    for x in (-s / 2, s / 2):
        for z in (-s / 2, s / 2):
            parts.append(box((x, 0, z), (t, s, t), wood_l))
    for x in (-s / 2, s / 2):
        for y in (-s / 2, s / 2):
            parts.append(box((x, y, 0), (t, t, s), wood_l))
    parts.append(box((0, -s / 2, 0), (s * 1.05, t, s * 0.09), wood_l, rot=(0, 0.7, 0)))
    return parts


def crate_stack():
    reset()
    wood = material('wood', (0.62, 0.42, 0.22))
    wood_l = material('wood_l', (0.82, 0.62, 0.36))
    s = 0.55
    t = s * 0.075
    z0 = s / 2 + t / 2
    parts = []
    for loc, rz in (((-0.29, 0, z0), 0.06), ((0.29, 0, z0), -0.05),
                    ((0.0, 0.02, z0 + s), 0.1)):
        cp = crate_parts(s, wood, wood_l)
        c, sn = math.cos(rz), math.sin(rz)
        for o in cp:
            x, y, z = o.location
            o.location = (x * c - y * sn + loc[0], x * sn + y * c + loc[1], z + loc[2])
            o.rotation_euler.z += rz
        parts += cp
    join_parts('crate_stack', parts)
    export('crate_stack')


# ------------------------------------------------------------ 10 çiçek tarhı
def flower_bed():
    reset()
    mint = material('planter', (0.42, 0.84, 0.7))
    cream = material('rim', (0.99, 0.96, 0.88))
    soil = material('soil', (0.34, 0.22, 0.12))
    stem = material('stem', (0.32, 0.65, 0.28))
    cols = [material('f%d' % i, c) for i, c in enumerate([
        (0.97, 0.35, 0.45), (0.99, 0.78, 0.2), (0.66, 0.45, 0.92),
        (0.38, 0.63, 0.95), (0.99, 0.55, 0.75)])]
    center = material('center', (0.99, 0.85, 0.25))
    parts = [box((0, 0, 0.15), (1.5, 0.55, 0.3), mint),
             box((0, 0, 0.31), (1.58, 0.63, 0.06), cream),
             box((0, 0, 0.325), (1.4, 0.45, 0.04), soil)]
    xs = (-0.56, -0.28, 0.0, 0.28, 0.56)
    hs = (0.2, 0.26, 0.18, 0.24, 0.21)
    ys = (0.05, -0.06, 0.02, -0.04, 0.06)
    for i, x in enumerate(xs):
        h = hs[i]
        y = ys[i]
        top = 0.34 + h
        parts.append(cyl((x, y, 0.34 + h / 2), 0.014, h, stem, verts=5))
        for k in range(5):
            a = k * math.tau / 5
            parts.append(sphere((x + math.cos(a) * 0.055, y + math.sin(a) * 0.055, top),
                                0.045, cols[i], scale=(1, 1, 0.5), subdiv=1))
        parts.append(sphere((x, y, top + 0.02), 0.03, center, subdiv=1))
        for s in (-1, 1):
            parts.append(sphere((x + s * 0.05, y - 0.02, 0.34 + h * 0.45), 0.035, stem,
                                scale=(2.0, 1, 0.45), subdiv=1))
    join_parts('flower_bed', parts)
    export('flower_bed')


pet_cat()
pet_dog()
pet_bunny()
pet_dragon()
pet_unicorn()
kiosk()
balloon_arch()
fountain_big()
crate_stack()
flower_bed()
print('ALL EXTRA PROPS DONE')

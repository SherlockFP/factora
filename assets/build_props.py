# Tatlı Tycoon — çevre varlıkları (Blender headless).
# Kullanım:  blender.exe -b -P assets/build_props.py
# Çıktı:     assets/props/*.glb

import bpy
import math
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'props')
os.makedirs(OUT, exist_ok=True)
random.seed(7)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, rough=0.85, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (color[0], color[1], color[2], 1.0)
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (emit[0], emit[1], emit[2], 1.0)
        b.inputs['Emission Strength'].default_value = emit_strength
    return m


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def sphere(loc, radius, mat, scale=(1, 1, 1), subdiv=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=loc)
    o = bpy.context.object
    o.scale = scale
    o.data.materials.append(mat)
    smooth(o)
    return o


def cone(loc, r1, r2, depth, mat, rot=(0, 0, 0), verts=12):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc)
    o = bpy.context.object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def cyl(loc, radius, depth, mat, rot=(0, 0, 0), verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def box(loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = size
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def torus(loc, major, minor, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(location=loc, major_radius=major, minor_radius=minor,
                                     major_segments=20, minor_segments=8)
    o = bpy.context.object
    o.rotation_euler = rot
    o.data.materials.append(mat)
    smooth(o)
    return o


def join(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    return bpy.context.object


def export(name):
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )
    print('EXPORTED', path, os.path.getsize(path), 'bytes')


# ---------------------------------------------------------------- trees
def tree(name, height, leaf_colors, spread, blobs):
    reset()
    trunk_mat = material('trunk', (0.42, 0.24, 0.11))
    mats = [material('leaf%d' % i, c) for i, c in enumerate(leaf_colors)]
    parts = []
    h = height
    parts.append(cone((0, 0, h * 0.36), 0.30, 0.18, h * 0.72, trunk_mat, verts=10))
    parts.append(cyl((0, 0, 0.08), 0.34, 0.16, trunk_mat, verts=10))
    for i in range(blobs):
        a = (i / blobs) * math.tau + random.uniform(-0.3, 0.3)
        r = spread * (0.45 + random.random() * 0.5)
        z = h * (0.62 + 0.28 * (i / max(1, blobs - 1)))
        parts.append(sphere(
            (math.cos(a) * r, math.sin(a) * r, z),
            spread * (0.62 + random.random() * 0.2),
            mats[i % len(mats)],
            scale=(1.05, 1.05, 0.82),
            subdiv=2,
        ))
    parts.append(sphere((0, 0, h * 0.95), spread * 0.68, mats[0], scale=(1.0, 1.0, 0.85), subdiv=2))
    obj = join(parts)
    obj.name = name
    export(name)


tree('tree_a', 4.2, [(0.24, 0.58, 0.28), (0.33, 0.70, 0.34), (0.42, 0.80, 0.42)], 1.05, 4)
tree('tree_b', 3.4, [(0.20, 0.50, 0.30), (0.30, 0.66, 0.36), (0.45, 0.82, 0.50)], 1.25, 5)
tree('tree_c', 5.0, [(0.20, 0.52, 0.24), (0.28, 0.64, 0.30), (0.38, 0.76, 0.38)], 0.9, 3)


# ---------------------------------------------------------------- lamp
def lamp():
    reset()
    metal = material('metal', (0.12, 0.14, 0.18), rough=0.55)
    glow = material('glow', (1.0, 0.86, 0.45), rough=0.4, emit=(1.0, 0.78, 0.32), emit_strength=6.0)
    parts = [
        cyl((0, 0, 0.12), 0.20, 0.24, metal, verts=10),
        cyl((0, 0, 1.55), 0.075, 3.0, metal, verts=8),
        box((0, 0, 3.18), (0.36, 0.36, 0.44), metal),
        box((0, 0, 3.18), (0.30, 0.30, 0.34), glow),
        cone((0, 0, 3.52), 0.36, 0.05, 0.30, metal, verts=8),
        sphere((0, 0, 3.70), 0.07, metal),
    ]
    obj = join(parts)
    obj.name = 'lamp'
    export('lamp')


lamp()


# ---------------------------------------------------------------- bench
def bench():
    reset()
    wood = material('wood', (0.62, 0.40, 0.20))
    metal = material('metal', (0.18, 0.20, 0.24), rough=0.6)
    parts = []
    for i in range(3):
        parts.append(box((0, -0.14 + i * 0.14, 0.46), (1.5, 0.11, 0.07), wood))
    for i in range(2):
        parts.append(box((0, 0.20, 0.72 + i * 0.18), (1.5, 0.07, 0.10), wood))
    for x in (-0.6, 0.6):
        parts.append(box((x, 0, 0.22), (0.08, 0.45, 0.44), metal))
        parts.append(box((x, 0.20, 0.78), (0.07, 0.07, 0.62), metal))
    obj = join(parts)
    obj.name = 'bench'
    export('bench')


bench()


# ---------------------------------------------------------------- cloud
def cloud():
    reset()
    white = material('cloud', (0.98, 0.99, 1.0), rough=1.0)
    parts = [
        sphere((-1.1, 0, 0.1), 0.85, white, scale=(1.2, 1.0, 0.8)),
        sphere((-0.3, 0.1, 0.35), 1.05, white, scale=(1.2, 1.0, 0.85)),
        sphere((0.7, 0, 0.2), 0.9, white, scale=(1.1, 1.0, 0.8)),
        sphere((1.5, 0, -0.05), 0.65, white, scale=(1.0, 1.0, 0.8)),
        sphere((0.2, -0.2, -0.1), 0.95, white, scale=(1.4, 1.0, 0.7)),
    ]
    obj = join(parts)
    obj.name = 'cloud'
    export('cloud')


cloud()


# ---------------------------------------------------------------- kiosk sign
def sign():
    reset()
    wood = material('wood', (0.55, 0.35, 0.18))
    cream = material('cream', (0.98, 0.95, 0.87))
    red = material('red', (0.85, 0.24, 0.24))
    parts = [
        cyl((-1.6, 0, 1.2), 0.09, 2.4, wood, verts=8),
        cyl((1.6, 0, 1.2), 0.09, 2.4, wood, verts=8),
        box((0, 0, 2.35), (3.5, 0.18, 0.85), cream),
        box((0, 0.02, 2.72), (3.6, 0.22, 0.12), red),
        box((0, -0.02, 1.98), (3.6, 0.22, 0.12), red),
    ]
    obj = join(parts)
    obj.name = 'sign'
    export('sign')


sign()

print('ALL PROPS DONE')

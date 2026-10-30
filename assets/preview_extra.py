# Ek prop setini tek karede görmek için kontak sayfası render eder.
# Kullanım: blender.exe -b -P assets/preview_extra.py
import bpy
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = ['pet_cat', 'pet_dog', 'pet_bunny', 'pet_dragon', 'pet_unicorn',
         'kiosk', 'crate_stack', 'flower_bed', 'fountain_big', 'balloon_arch']
# (x, y) — ön sıra minik evcil hayvanlar, arka sıra büyük props
SPOTS = [(-5.2, -0.9), (-3.6, -0.9), (-2.0, -0.9), (-0.4, -0.9), (1.2, -0.9),
         (-5.0, 4.2), (-2.4, 4.2), (0.2, 4.2), (4.9, 5.0), (0.6, 9.4)]
OUT = os.path.join(HERE, 'preview_extra.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
world = bpy.data.worlds.new('W')
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.62, 0.75, 0.9, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.45

label_mat = bpy.data.materials.new('label')
label_mat.use_nodes = True
label_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.15, 0.14, 0.16, 1)

for name, (x, y) in zip(NAMES, SPOTS):
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, 'props', name + '.glb'))
    for o in bpy.context.selected_objects:
        o.location.x += x
        o.location.y += y
    bpy.ops.object.text_add(location=(x, y - 0.75, 0.02), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.object
    t.data.body = name
    t.data.size = 0.26
    t.data.align_x = 'CENTER'
    t.data.materials.append(label_mat)
    bpy.ops.object.convert(target='MESH')

bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -0.01))
plane = bpy.context.object
m = bpy.data.materials.new('floor')
m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.62, 0.6, 0.56, 1)
plane.data.materials.append(m)

bpy.ops.object.light_add(type='SUN', location=(-6, -9, 12))
sun = bpy.context.object
sun.data.energy = 2.2
sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
bpy.ops.object.light_add(type='AREA', location=(4, -6, 4))
fill = bpy.context.object
fill.data.energy = 220
fill.data.size = 10
fill.rotation_euler = (math.radians(70), 0, math.radians(20))
bpy.ops.object.light_add(type='AREA', location=(-6, 6, 6))
rim = bpy.context.object
rim.data.energy = 140
rim.data.size = 8
rim.rotation_euler = (math.radians(125), 0, math.radians(-40))

bpy.ops.object.camera_add(location=(0.0, -15.4, 9.4))
cam = bpy.context.object
cam.rotation_euler = (math.radians(71), 0, 0)
cam.data.lens = 44
bpy.context.scene.camera = cam

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT'
sc.render.resolution_x = 1600
sc.render.resolution_y = 1100
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('PREVIEW', OUT)

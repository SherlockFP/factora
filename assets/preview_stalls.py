# Tezgah modellerini tek karede görmek için kontak sayfası render eder.
# Kullanım: blender.exe -b -P assets/preview_stalls.py
import bpy
import glob
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = sorted(glob.glob(os.path.join(HERE, 'props', 'stall_*.glb')))
OUT = os.path.join(HERE, 'preview_stalls.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
world = bpy.data.worlds.new('W')
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.48, 0.66, 0.86, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.55

for i, f in enumerate(FILES):
    bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.context.selected_objects]
    for o in new:
        o.location.x += (i % 5) * 4.4 - 8.8
        o.location.y += (i // 5) * 5.4 - 2.7

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.01))
plane = bpy.context.object
m = bpy.data.materials.new('floor')
m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.85, 0.85, 0.8, 1)
plane.data.materials.append(m)

bpy.ops.object.light_add(type='SUN', location=(-6, -9, 12))
sun = bpy.context.object
sun.data.energy = 2.1
sun.rotation_euler = (math.radians(52), 0, math.radians(-38))
bpy.ops.object.light_add(type='AREA', location=(0, -8, 6))
fill = bpy.context.object
fill.data.energy = 260
fill.data.size = 9
fill.rotation_euler = (math.radians(60), 0, 0)

bpy.ops.object.camera_add(location=(0, -27, 10.5))
cam = bpy.context.object
cam.rotation_euler = (math.radians(74), 0, 0)
cam.data.lens = 50
bpy.context.scene.camera = cam

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT'
sc.render.resolution_x = 1800
sc.render.resolution_y = 900
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = -0.2
sc.render.film_transparent = False
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('PREVIEW', OUT)

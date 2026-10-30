# Tek tezgahı yakın plan render eder:  blender.exe -b -P assets/preview_one.py -- stall_candy
import bpy
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['stall_stand']
name = argv[0]
OUT = os.path.join(HERE, 'preview_' + name + '.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
world = bpy.data.worlds.new('W')
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.68, 0.88, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.5

bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, 'props', name + '.glb'))

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.01))
plane = bpy.context.object
m = bpy.data.materials.new('floor')
m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.82, 0.8, 0.74, 1)
plane.data.materials.append(m)

bpy.ops.object.light_add(type='SUN', location=(-4, -6, 9))
sun = bpy.context.object
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(48), 0, math.radians(-35))
bpy.ops.object.light_add(type='AREA', location=(2, -6, 3))
fill = bpy.context.object
fill.data.energy = 160
fill.data.size = 6
fill.rotation_euler = (math.radians(70), 0, 0)

bpy.ops.object.camera_add(location=(4.0, -6.4, 3.5))
cam = bpy.context.object
cam.rotation_euler = (math.radians(78), 0, math.radians(31))
cam.data.lens = 55
bpy.context.scene.camera = cam

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT'
sc.render.resolution_x = 900
sc.render.resolution_y = 900
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('PREVIEW', OUT)

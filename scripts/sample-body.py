import bpy, random, struct, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
name = sys.argv[sys.argv.index('--')+1]; N = int(sys.argv[sys.argv.index('--')+2]); out = sys.argv[sys.argv.index('--')+3]
o = bpy.data.objects[name]
dg = bpy.context.evaluated_depsgraph_get()
me = o.evaluated_get(dg).to_mesh()
me.transform(o.matrix_world)
bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [p.vertices[:] for p in me.polygons])
xs=[v.co.x for v in me.vertices]; ys=[v.co.y for v in me.vertices]; zs=[v.co.z for v in me.vertices]
lo=Vector((min(xs),min(ys),min(zs))); hi=Vector((max(xs),max(ys),max(zs)))
print('BBOX', [round(x,3) for x in lo], [round(x,3) for x in hi])
def inside(p):
    # parity of ray hits along +X
    n=0; origin=p.copy(); d=Vector((1,0,0)); guard=0
    while guard<64:
        loc, nrm, idx, dist = bvh.ray_cast(origin, d, 10.0)
        if loc is None: break
        n+=1; origin = loc + d*1e-4; guard+=1
    return n%2==1
random.seed(7); pts=[]; tries=0
while len(pts)<N and tries<N*200:
    tries+=1
    p=Vector((random.uniform(lo.x,hi.x),random.uniform(lo.y,hi.y),random.uniform(lo.z,hi.z)))
    if inside(p): pts.append(p)
print('GOT', len(pts), 'tries', tries)
# Blender Z-up -> three Y-up: (x, z, -y); нормировка: стопы на 0.08, рост 1.62 (как у капсульной фигуры)
h = hi.z-lo.z; s = 1.62/h
with open(out,'wb') as f:
    f.write(struct.pack('<I', len(pts)))
    for p in pts:
        x=(p.x-(lo.x+hi.x)/2)*s; y=(p.z-lo.z)*s+0.08; z=-(p.y-(lo.y+hi.y)/2)*s
        f.write(struct.pack('<hhh', int(round(x*10000)), int(round(y*10000)), int(round(z*10000))))
print('WROTE', out)

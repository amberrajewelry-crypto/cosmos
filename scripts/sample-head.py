# Blender: sample N surface points of the realistic head (Human Base Meshes, CC0) -> public/body.bin
# Usage: Blender -b bundle.blend --python scripts/sample-head.py -- N out.bin
import bpy, random, struct, sys, bisect
from mathutils import Vector
from mathutils.bvhtree import BVHTree
N = int(sys.argv[sys.argv.index('--')+1]); out = sys.argv[sys.argv.index('--')+2]
NAMES = ['GEO-head_sculpting_realistic']
dg = bpy.context.evaluated_depsgraph_get()
polys = []; V = []; NRM = []
for name in NAMES:
    o = bpy.data.objects[name]
    for m in o.modifiers:
        if m.type == 'MULTIRES': m.levels = m.total_levels  # full sculpt detail
    me = o.evaluated_get(dg).to_mesh(); me.transform(o.matrix_world)
    base = len(V); V += [v.co.copy() for v in me.vertices]
    me.calc_loop_triangles()
    # Density is uniform on screen (view term only); relief comes from a per-point shade = Lambert + cast shadow.
    L = Vector((-0.55, -0.75, 0.45)).normalized()  # raking key light: upper front-left; the face points -Y in this file
    for t in me.loop_triangles:
        n = t.normal.copy()  # already world space: the mesh was transformed above
        # View term (camera looks along +Y here): thin out the silhouette so the lit rim does not overexpose.
        w = 0.04 + 0.96 * max(0.0, -n.y) ** 1.5
        polys.append((t.area * w, [base + i for i in t.vertices])); NRM.append(n)
xs=[v.x for v in V]; ys=[v.y for v in V]; zs=[v.z for v in V]
lo=Vector((min(xs),min(ys),min(zs))); hi=Vector((max(xs),max(ys),max(zs)))
print('BBOX', [round(x,3) for x in lo], [round(x,3) for x in hi])
random.seed(7)
tot = sum(a for a,_ in polys); acc=[]; run=0.0
for a,_ in polys: run+=a; acc.append(run)
# Shadow test: a point whose ray towards the light hits the mesh (mouth bag, eye sockets, under the chin) is mostly dropped.
bvh = BVHTree.FromPolygons(V, [vs for _, vs in polys])
FILL = Vector((0.75, -0.5, 0.1)).normalized()
AO_RAYS = 16; AO_DIST = 0.12  # head is ~0.26 wide in this file
pts=[]
CUT = lo.z + 0.3 * (hi.z - lo.z)  # drop the collar flare at the neck base
while len(pts) < N:
    i = bisect.bisect(acc, random.random()*tot); vs = polys[min(i,len(polys)-1)][1]
    a,b,c = V[vs[0]], V[vs[1]], V[vs[2]]
    u,v = random.random(), random.random()
    if u+v>1: u,v = 1-u, 1-v
    q = a + (b-a)*u + (c-a)*v
    if q.z < CUT: continue
    n = NRM[min(i,len(polys)-1)]
    # Hidden from the camera (mouth bag, inner eyelids) -> drop, it only doubles the density on screen.
    if bvh.ray_cast(q + n * 1e-3, Vector((0, -1, 0)), 5.0)[0] is not None: continue
    lit = 0.0 if bvh.ray_cast(q + n * 1e-3, L, 5.0)[0] is not None else max(0.0, n.dot(L))
    lit = max(lit, 0.4 * max(0.0, n.dot(FILL)))  # soft fill from the other side: the shadowed cheek keeps its silhouette
    # Ambient occlusion: cavities (eyes, nostrils, lip line, ears) go dark so the features read.
    hits = 0
    for _ in range(AO_RAYS):
        d = Vector((random.gauss(0,1), random.gauss(0,1), random.gauss(0,1))).normalized()
        if d.dot(n) < 0: d = -d
        if bvh.ray_cast(q + n * 1e-3, d, AO_DIST)[0] is not None: hits += 1
    ao = 1.0 - hits / AO_RAYS
    pts.append((q, 0.05 + 0.95 * (0.45 + 0.55 * lit) * ao ** 2.0 * (0.35 + 0.65 * max(0.0, -n.y))))
# Blender Z-up -> three Y-up, face (-Y here) turned to the camera (+Z): (x, z, -y). 4th int16 = shade x1e4. Head height -> 1.45, chin at 0.15 (same frame as the body figure).
h = hi.z-CUT; s = 1.45/h; lo.z = CUT
with open(out,'wb') as f:
    f.write(struct.pack('<I', len(pts)))
    for p, sh in pts:
        x=(p.x-(lo.x+hi.x)/2)*s; y=(p.z-lo.z)*s+0.15; z=-(p.y-(lo.y+hi.y)/2)*s
        f.write(struct.pack('<hhhh', int(round(x*10000)), int(round(y*10000)), int(round(z*10000)), int(round(sh*10000))))
print('WROTE', out, len(pts))

import * as THREE from 'three';

// Главный образ: тело как окно, а не силуэт (§4.1). Полупрозрачный объём,
// внутри которого позже проступят точки (реликтовые фотоны, атомы по эпохе).
export function createFigure(): THREE.Object3D {
  const geom = new THREE.CapsuleGeometry(0.25, 1.1, 8, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xbfa14a,        // тёплое золото палитры происхождения (§4.3)
    transparent: true,
    opacity: 0.15,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0.85;
  return mesh;
}

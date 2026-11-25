/* =========================================================================
   Inkworks: Zero-dependency GLTF 2.0 / binary GLB loader
   Built directly against vendored Three.js r169 ('three') for 100% offline use.
   Parses nested scene hierarchies, TRS/matrix transforms, meshes, primitives,
   indices, positions, normals, UVs, vertex colors, PBR/named materials, and
   node/mesh/material `extras` metadata into Three.js Group/Mesh trees with
   `userData` intact.
   ========================================================================= */
import * as THREE from 'three';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_CHUNK_JSON = 0x4e4f534a; // 'JSON'
const GLB_CHUNK_BIN = 0x004e4942; // 'BIN\0'

const COMPONENT_TYPES = {
  5120: { ArrayType: Int8Array, bytes: 1, getter: 'getInt8' },
  5121: { ArrayType: Uint8Array, bytes: 1, getter: 'getUint8' },
  5122: { ArrayType: Int16Array, bytes: 2, getter: 'getInt16' },
  5123: { ArrayType: Uint16Array, bytes: 2, getter: 'getUint16' },
  5125: { ArrayType: Uint32Array, bytes: 4, getter: 'getUint32' },
  5126: { ArrayType: Float32Array, bytes: 4, getter: 'getFloat32' },
};

const TYPE_SIZES = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

const ATTR_MAP = {
  POSITION: 'position',
  NORMAL: 'normal',
  TEXCOORD_0: 'uv',
  TEXCOORD_1: 'uv1',
  COLOR_0: 'color',
};

const textDecoder = new TextDecoder('utf-8');

function decodeBase64Uri(uri) {
  const comma = uri.indexOf(',');
  const b64 = comma >= 0 ? uri.slice(comma + 1) : uri;
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  // Node.js fallback
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  throw new Error('GLTFLoader: cannot decode base64 buffer URI in this runtime');
}

function resolveUri(uri, basePath) {
  if (/^(data:|blob:|https?:|\/)/i.test(uri)) return uri;
  if (!basePath) return uri;
  const sep = basePath.endsWith('/') ? '' : '/';
  return `${basePath}${sep}${uri}`;
}

function dirname(url) {
  const clean = String(url || '').split('?')[0].split('#')[0];
  const idx = clean.lastIndexOf('/');
  return idx >= 0 ? clean.slice(0, idx + 1) : '';
}

function isGLB(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 12) return false;
  return new DataView(buffer, 0, 12).getUint32(0, true) === GLB_MAGIC;
}

function unpackGLB(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    if (ArrayBuffer.isView(arrayBuffer)) {
      arrayBuffer = arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);
    } else {
      throw new Error('parseGLB: expected ArrayBuffer or TypedArray');
    }
  }
  if (arrayBuffer.byteLength < 12) throw new Error('parseGLB: file shorter than 12-byte GLB header');
  const header = new DataView(arrayBuffer, 0, 12);
  const magic = header.getUint32(0, true);
  const version = header.getUint32(4, true);
  const totalLength = header.getUint32(8, true);
  if (magic !== GLB_MAGIC) throw new Error(`parseGLB: invalid magic 0x${magic.toString(16)}`);
  if (version !== 2) throw new Error(`parseGLB: unsupported glTF version ${version} (expected 2)`);

  const limit = Math.min(totalLength, arrayBuffer.byteLength);
  let offset = 12;
  let json = null;
  let binChunk = null;

  while (offset + 8 <= limit) {
    const chunkView = new DataView(arrayBuffer, offset, 8);
    const chunkLen = chunkView.getUint32(0, true);
    const chunkType = chunkView.getUint32(4, true);
    const dataStart = offset + 8;
    const dataEnd = Math.min(dataStart + chunkLen, limit);
    if (chunkType === GLB_CHUNK_JSON) {
      const jsonBytes = new Uint8Array(arrayBuffer, dataStart, dataEnd - dataStart);
      json = JSON.parse(textDecoder.decode(jsonBytes));
    } else if (chunkType === GLB_CHUNK_BIN) {
      // Slice into a 0-aligned ArrayBuffer so Float32Array / Uint16Array views never misalign
      binChunk = arrayBuffer.slice(dataStart, dataEnd);
    }
    offset = dataStart + chunkLen;
  }

  if (!json) throw new Error('parseGLB: missing JSON chunk');
  return { json, binChunk };
}

function readTypedArray(buffer, byteOffset, byteStride, count, itemSize, compInfo) {
  const { ArrayType, bytes, getter } = compInfo;
  const elemBytes = itemSize * bytes;
  const out = new ArrayType(count * itemSize);

  // Fast path: tightly packed and aligned
  if ((!byteStride || byteStride === elemBytes) && (byteOffset % bytes === 0)) {
    const src = new ArrayType(buffer, byteOffset, count * itemSize);
    out.set(src);
    return out;
  }

  // General path: interleaved stride or unaligned offset
  const stride = byteStride || elemBytes;
  const dv = new DataView(buffer);
  let dst = 0;
  for (let i = 0; i < count; i++) {
    let pos = byteOffset + i * stride;
    for (let c = 0; c < itemSize; c++) {
      out[dst++] = dv[getter](pos, true);
      pos += bytes;
    }
  }
  return out;
}

function readAccessor(json, buffers, accessorIndex) {
  const acc = json.accessors?.[accessorIndex];
  if (!acc) throw new Error(`GLTFLoader: invalid accessor index ${accessorIndex}`);
  const compInfo = COMPONENT_TYPES[acc.componentType];
  if (!compInfo) throw new Error(`GLTFLoader: unsupported componentType ${acc.componentType}`);
  const itemSize = TYPE_SIZES[acc.type];
  if (!itemSize) throw new Error(`GLTFLoader: unsupported accessor type ${acc.type}`);

  const count = acc.count || 0;
  let array;

  if (acc.bufferView !== undefined) {
    const bv = json.bufferViews[acc.bufferView];
    const buf = buffers[bv.buffer || 0];
    if (!buf) throw new Error(`GLTFLoader: missing buffer ${bv.buffer || 0} for bufferView ${acc.bufferView}`);
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    array = readTypedArray(buf, byteOffset, bv.byteStride || 0, count, itemSize, compInfo);
  } else {
    array = new compInfo.ArrayType(count * itemSize);
  }

  // Optional sparse accessor overrides
  if (acc.sparse && acc.sparse.count > 0) {
    const sp = acc.sparse;
    const idxComp = COMPONENT_TYPES[sp.indices.componentType];
    const idxBv = json.bufferViews[sp.indices.bufferView];
    const idxBuf = buffers[idxBv.buffer || 0];
    const idxArr = readTypedArray(
      idxBuf,
      (idxBv.byteOffset || 0) + (sp.indices.byteOffset || 0),
      idxBv.byteStride || 0,
      sp.count,
      1,
      idxComp,
    );

    const valBv = json.bufferViews[sp.values.bufferView];
    const valBuf = buffers[valBv.buffer || 0];
    const valArr = readTypedArray(
      valBuf,
      (valBv.byteOffset || 0) + (sp.values.byteOffset || 0),
      valBv.byteStride || 0,
      sp.count,
      itemSize,
      compInfo,
    );

    for (let i = 0; i < sp.count; i++) {
      const targetIndex = idxArr[i] * itemSize;
      const srcIndex = i * itemSize;
      for (let c = 0; c < itemSize; c++) array[targetIndex + c] = valArr[srcIndex + c];
    }
  }

  return new THREE.BufferAttribute(array, itemSize, Boolean(acc.normalized));
}

function buildMaterial(matDef, index) {
  const pbr = matDef?.pbrMetallicRoughness || {};
  const factor = Array.isArray(pbr.baseColorFactor) ? pbr.baseColorFactor : [0.8, 0.82, 0.85, 1];
  const color = new THREE.Color().setRGB(factor[0], factor[1], factor[2], THREE.SRGBColorSpace);
  const opacity = factor[3] ?? 1;
  const alphaMode = matDef?.alphaMode || 'OPAQUE';

  const mat = new THREE.MeshStandardMaterial({
    name: matDef?.name || `gltf_material_${index}`,
    color,
    metalness: pbr.metallicFactor ?? 0.35,
    roughness: pbr.roughnessFactor ?? 0.55,
    transparent: alphaMode === 'BLEND' || opacity < 0.999,
    opacity,
    alphaTest: alphaMode === 'MASK' ? (matDef?.alphaCutoff ?? 0.5) : 0,
    side: matDef?.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });

  if (Array.isArray(matDef?.emissiveFactor)) {
    mat.emissive.setRGB(matDef.emissiveFactor[0], matDef.emissiveFactor[1], matDef.emissiveFactor[2]);
  }

  if (matDef?.extras && typeof matDef.extras === 'object') {
    Object.assign(mat.userData, matDef.extras);
    mat.userData.gltfExtras = matDef.extras;
  }
  return mat;
}

function convertStripOrFanToTriangles(indices, vertexCount, mode) {
  const getIdx = indices ? (i) => indices.getX(i) : (i) => i;
  const n = indices ? indices.count : vertexCount;
  const out = [];
  if (mode === 5) {
    // TRIANGLE_STRIP
    for (let i = 0; i < n - 2; i++) {
      const a = getIdx(i), b = getIdx(i + 1), c = getIdx(i + 2);
      if (i % 2 === 0) out.push(a, b, c);
      else out.push(b, a, c);
    }
  } else if (mode === 6) {
    // TRIANGLE_FAN
    const a = getIdx(0);
    for (let i = 1; i < n - 1; i++) out.push(a, getIdx(i), getIdx(i + 1));
  }
  const Arr = vertexCount > 65535 ? Uint32Array : Uint16Array;
  return new THREE.BufferAttribute(new Arr(out), 1);
}

function buildPrimitiveObject(json, buffers, materials, prim, meshDef, meshIndex, primIndex) {
  const geo = new THREE.BufferGeometry();
  const attrs = prim.attributes || {};
  for (const [gltfAttr, accIndex] of Object.entries(attrs)) {
    const threeName = ATTR_MAP[gltfAttr];
    if (!threeName) continue;
    geo.setAttribute(threeName, readAccessor(json, buffers, accIndex));
  }

  const mode = prim.mode ?? 4;
  let indexAttr = prim.indices !== undefined ? readAccessor(json, buffers, prim.indices) : null;
  if (mode === 5 || mode === 6) {
    const vCount = geo.attributes.position ? geo.attributes.position.count : 0;
    indexAttr = convertStripOrFanToTriangles(indexAttr, vCount, mode);
  }
  if (indexAttr) geo.setIndex(indexAttr);

  const isTriangleMesh = mode === 4 || mode === 5 || mode === 6;
  if (isTriangleMesh && !geo.attributes.normal && geo.attributes.position) {
    geo.computeVertexNormals();
  }
  if (geo.attributes.position) {
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  }

  const matDef = prim.material !== undefined ? json.materials?.[prim.material] : null;
  const material = prim.material !== undefined && materials[prim.material]
    ? materials[prim.material]
    : new THREE.MeshStandardMaterial({ name: 'default_gltf_mat', color: 0xc3ccd8, metalness: 0.25, roughness: 0.65 });

  let obj;
  if (isTriangleMesh) {
    obj = new THREE.Mesh(geo, material);
  } else if (mode === 1) {
    obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: material.color }));
  } else if (mode === 2) {
    obj = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: material.color }));
  } else if (mode === 3) {
    obj = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: material.color }));
  } else if (mode === 0) {
    obj = new THREE.Points(geo, new THREE.PointsMaterial({ color: material.color, size: 0.04 }));
  } else {
    obj = new THREE.Mesh(geo, material);
  }

  obj.name = meshDef?.name
    ? (meshDef.primitives.length > 1 ? `${meshDef.name}_prim_${primIndex}` : meshDef.name)
    : `mesh_${meshIndex}_${primIndex}`;

  if (meshDef?.extras && typeof meshDef.extras === 'object') {
    Object.assign(obj.userData, meshDef.extras);
    obj.userData.gltfMeshExtras = meshDef.extras;
  }
  if (prim.extras && typeof prim.extras === 'object') {
    Object.assign(obj.userData, prim.extras);
    obj.userData.gltfPrimitiveExtras = prim.extras;
  }
  if (matDef) {
    obj.userData.gltfMaterialName = matDef.name || null;
    if (matDef.extras) {
      obj.userData.gltfMaterialExtras = matDef.extras;
      if (matDef.extras.materialCode && !obj.userData.materialCode) {
        obj.userData.materialCode = matDef.extras.materialCode;
      }
    }
  }
  return obj;
}

function applyNodeTransform(obj, nodeDef) {
  if (Array.isArray(nodeDef.matrix) && nodeDef.matrix.length === 16) {
    const m = new THREE.Matrix4().fromArray(nodeDef.matrix);
    m.decompose(obj.position, obj.quaternion, obj.scale);
    return;
  }
  if (Array.isArray(nodeDef.translation)) {
    obj.position.set(nodeDef.translation[0], nodeDef.translation[1], nodeDef.translation[2]);
  }
  if (Array.isArray(nodeDef.rotation)) {
    obj.quaternion.set(nodeDef.rotation[0], nodeDef.rotation[1], nodeDef.rotation[2], nodeDef.rotation[3]);
  }
  if (Array.isArray(nodeDef.scale)) {
    obj.scale.set(nodeDef.scale[0], nodeDef.scale[1], nodeDef.scale[2]);
  }
}

function buildResultFromJsonAndBuffers(json, buffers) {
  const materials = (json.materials || []).map((m, i) => buildMaterial(m, i));
  const meshes = [];
  const nodes = [];
  const nodesByName = new Map();

  const nodeDefs = json.nodes || [];
  for (let i = 0; i < nodeDefs.length; i++) {
    const nd = nodeDefs[i] || {};
    let obj;

    if (nd.mesh !== undefined && json.meshes?.[nd.mesh]) {
      const meshDef = json.meshes[nd.mesh];
      const prims = meshDef.primitives || [];
      if (prims.length === 1) {
        obj = buildPrimitiveObject(json, buffers, materials, prims[0], meshDef, nd.mesh, 0);
        meshes.push(obj);
      } else {
        obj = new THREE.Group();
        for (let p = 0; p < prims.length; p++) {
          const child = buildPrimitiveObject(json, buffers, materials, prims[p], meshDef, nd.mesh, p);
          obj.add(child);
          meshes.push(child);
        }
        if (meshDef.extras && typeof meshDef.extras === 'object') {
          Object.assign(obj.userData, meshDef.extras);
          obj.userData.gltfMeshExtras = meshDef.extras;
        }
      }
    } else {
      obj = new THREE.Group();
    }

    obj.name = nd.name || obj.name || `node_${i}`;
    applyNodeTransform(obj, nd);

    if (nd.extras && typeof nd.extras === 'object') {
      Object.assign(obj.userData, nd.extras);
      obj.userData.gltfExtras = nd.extras;
    }
    obj.userData.gltfNodeIndex = i;

    nodes.push(obj);
    if (obj.name && !nodesByName.has(obj.name)) nodesByName.set(obj.name, obj);
  }

  // Wire parent -> child hierarchy
  for (let i = 0; i < nodeDefs.length; i++) {
    const children = nodeDefs[i]?.children;
    if (!Array.isArray(children)) continue;
    const parentObj = nodes[i];
    for (const childIdx of children) {
      if (nodes[childIdx]) parentObj.add(nodes[childIdx]);
    }
  }

  // Build scenes
  const sceneDefs = json.scenes && json.scenes.length ? json.scenes : [{ name: 'Scene', nodes: [] }];
  const scenes = sceneDefs.map((sd, si) => {
    const grp = new THREE.Group();
    grp.name = sd.name || `scene_${si}`;
    if (sd.extras && typeof sd.extras === 'object') {
      Object.assign(grp.userData, sd.extras);
      grp.userData.gltfExtras = sd.extras;
    }
    for (const rootIdx of sd.nodes || []) {
      if (nodes[rootIdx]) grp.add(nodes[rootIdx]);
    }
    return grp;
  });

  const defaultSceneIdx = json.scene ?? 0;
  const scene = scenes[defaultSceneIdx] || scenes[0] || new THREE.Group();
  scene.updateMatrixWorld(true);

  return {
    scene,
    scenes,
    nodes,
    nodesByName,
    materials,
    meshes,
    asset: json.asset || {},
    extras: json.extras || {},
    json,
  };
}

/**
 * Synchronously parses a binary GLTF 2.0 (.glb) ArrayBuffer into a Three.js scene graph.
 */
export function parseGLB(arrayBuffer) {
  const { json, binChunk } = unpackGLB(arrayBuffer);
  const buffers = (json.buffers || []).map((bufDef, idx) => {
    if (!bufDef.uri && idx === 0 && binChunk) return binChunk;
    if (bufDef.uri && bufDef.uri.startsWith('data:')) return decodeBase64Uri(bufDef.uri);
    if (idx === 0 && binChunk) return binChunk;
    throw new Error(`parseGLB: buffer ${idx} requires external URI "${bufDef.uri}" (use loadGLB for external buffers)`);
  });
  return buildResultFromJsonAndBuffers(json, buffers);
}

async function resolveBuffersAsync(json, binChunk, basePath) {
  const defs = json.buffers || [];
  const out = [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    if (!def.uri) {
      if (i === 0 && binChunk) { out.push(binChunk); continue; }
      throw new Error(`GLTFLoader: buffer ${i} has no URI and no BIN chunk`);
    }
    if (def.uri.startsWith('data:')) {
      out.push(decodeBase64Uri(def.uri));
      continue;
    }
    const url = resolveUri(def.uri, basePath);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`GLTFLoader: failed to fetch buffer ${url}: HTTP ${resp.status}`);
    out.push(await resp.arrayBuffer());
  }
  return out;
}

/**
 * Three.js-compatible GLTFLoader class (load, loadAsync, parse, parseAsync).
 */
export class GLTFLoader {
  constructor() {
    this.resourcePath = '';
  }

  setResourcePath(path) {
    this.resourcePath = path || '';
    return this;
  }

  async parseAsync(data, path = '') {
    const basePath = this.resourcePath || path || '';
    if (typeof data === 'string') {
      const json = JSON.parse(data);
      const buffers = await resolveBuffersAsync(json, null, basePath);
      return buildResultFromJsonAndBuffers(json, buffers);
    }
    if (isGLB(data)) {
      const { json, binChunk } = unpackGLB(data);
      const buffers = await resolveBuffersAsync(json, binChunk, basePath);
      return buildResultFromJsonAndBuffers(json, buffers);
    }
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      const json = JSON.parse(textDecoder.decode(bytes));
      const buffers = await resolveBuffersAsync(json, null, basePath);
      return buildResultFromJsonAndBuffers(json, buffers);
    }
    if (data && typeof data === 'object' && data.asset) {
      const buffers = await resolveBuffersAsync(data, null, basePath);
      return buildResultFromJsonAndBuffers(data, buffers);
    }
    throw new Error('GLTFLoader.parseAsync: unsupported input payload');
  }

  parse(data, path, onLoad, onError) {
    this.parseAsync(data, path)
      .then((res) => onLoad?.(res))
      .catch((err) => {
        if (onError) onError(err);
        else console.error(err);
      });
  }

  async loadAsync(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`GLTFLoader: failed to load ${url} (HTTP ${resp.status})`);
    const buf = await resp.arrayBuffer();
    return this.parseAsync(buf, dirname(url));
  }

  load(url, onLoad, _onProgress, onError) {
    this.loadAsync(url)
      .then((res) => onLoad?.(res))
      .catch((err) => {
        if (onError) onError(err);
        else console.error(err);
      });
  }
}

/**
 * Convenience async loader for local .glb or .gltf files.
 */
export async function loadGLB(url) {
  const loader = new GLTFLoader();
  return loader.loadAsync(url);
}

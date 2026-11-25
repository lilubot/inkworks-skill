#!/usr/bin/env python3
"""
Inkworks CAD-to-GLB Ingestion & Validation Tool (stdlib-first, optional OCCT/trimesh).

Converts CAD files (.step/.stp/.iges via optional OCP/cadquery/trimesh, or .obj/.stl/.gltf/.glb
via pure Python 3 stdlib) into Inkworks-ready binary GLTF 2.0 (.glb) assemblies preserving
Assembly -> Subassembly -> Part node hierarchy and `extras` engineering metadata.

Also exposes reusable pure-stdlib `GlbBuilder` and `validate_glb` helpers used by
`build_counter_glb.py` and external EMJAC CAD compilers.

Usage:
  python3 ingest_cad.py input.obj output.glb --name "WO_087837_032" --scale 0.0416667
  python3 ingest_cad.py input.stl output.glb --material-code 8012-4 --status locked
  python3 ingest_cad.py input.step output.glb --meta metadata.json
  python3 ingest_cad.py --validate skills/inkworks/kit/assets/counter_087837_032.glb
"""

from __future__ import annotations

import argparse
import json
import math
import os
import struct
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

GLB_MAGIC = 0x46546C67  # b'glTF'
GLB_VERSION = 2
CHUNK_JSON = 0x4E4F534A  # b'JSON'
CHUNK_BIN = 0x004E4942   # b'BIN\0'

COMPONENT_UNSIGNED_SHORT = 5123
COMPONENT_UNSIGNED_INT = 5125
COMPONENT_FLOAT = 5126
TARGET_ARRAY_BUFFER = 34962
TARGET_ELEMENT_ARRAY_BUFFER = 34963


def _align4(buf: bytearray, pad_byte: bytes = b"\x00") -> None:
    rem = len(buf) % 4
    if rem:
        buf.extend(pad_byte * (4 - rem))


def _vec_sub(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> Tuple[float, float, float]:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _vec_cross(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> Tuple[float, float, float]:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def _vec_norm(v: Tuple[float, float, float]) -> Tuple[float, float, float]:
    mag = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if mag < 1e-12:
        return (0.0, 1.0, 0.0)
    return (v[0] / mag, v[1] / mag, v[2] / mag)


class MeshData:
    """Accumulates indexed triangle geometry (positions, normals, UVs, indices) for one GLTF mesh."""

    def __init__(self) -> None:
        self.positions: List[Tuple[float, float, float]] = []
        self.normals: List[Tuple[float, float, float]] = []
        self.uvs: List[Tuple[float, float]] = []
        self.indices: List[int] = []

    def add_triangle(
        self,
        p0: Tuple[float, float, float],
        p1: Tuple[float, float, float],
        p2: Tuple[float, float, float],
        n0: Optional[Tuple[float, float, float]] = None,
        n1: Optional[Tuple[float, float, float]] = None,
        n2: Optional[Tuple[float, float, float]] = None,
        uv0: Tuple[float, float] = (0.0, 0.0),
        uv1: Tuple[float, float] = (1.0, 0.0),
        uv2: Tuple[float, float] = (1.0, 1.0),
    ) -> None:
        if n0 is None or n1 is None or n2 is None:
            fn = _vec_norm(_vec_cross(_vec_sub(p1, p0), _vec_sub(p2, p0)))
            n0 = n0 or fn
            n1 = n1 or fn
            n2 = n2 or fn
        base = len(self.positions)
        self.positions.extend([p0, p1, p2])
        self.normals.extend([n0, n1, n2])
        self.uvs.extend([uv0, uv1, uv2])
        self.indices.extend([base, base + 1, base + 2])

    def add_quad(
        self,
        p0: Tuple[float, float, float],
        p1: Tuple[float, float, float],
        p2: Tuple[float, float, float],
        p3: Tuple[float, float, float],
        normal: Optional[Tuple[float, float, float]] = None,
    ) -> None:
        """Add a CCW quad (p0 -> p1 -> p2 -> p3) split into two triangles."""
        fn = normal or _vec_norm(_vec_cross(_vec_sub(p1, p0), _vec_sub(p2, p0)))
        base = len(self.positions)
        self.positions.extend([p0, p1, p2, p3])
        self.normals.extend([fn, fn, fn, fn])
        self.uvs.extend([(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)])
        self.indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    def merge(self, other: "MeshData") -> None:
        base = len(self.positions)
        self.positions.extend(other.positions)
        self.normals.extend(other.normals)
        self.uvs.extend(other.uvs)
        self.indices.extend(i + base for i in other.indices)

    def scale_and_translate(
        self,
        scale: float = 1.0,
        offset: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> None:
        ox, oy, oz = offset
        self.positions = [
            (x * scale + ox, y * scale + oy, z * scale + oz)
            for (x, y, z) in self.positions
        ]

    @property
    def triangle_count(self) -> int:
        return len(self.indices) // 3

    @property
    def vertex_count(self) -> int:
        return len(self.positions)


class GlbBuilder:
    """Pure-stdlib GLTF 2.0 binary (.glb) scene graph builder with `extras` metadata."""

    def __init__(self, scene_name: str = "Assembly", generator: str = "Inkworks CAD-to-GLB 1.0") -> None:
        self.scene_name = scene_name
        self.generator = generator
        self.nodes: List[Dict[str, Any]] = []
        self.meshes: List[Dict[str, Any]] = []
        self.materials: List[Dict[str, Any]] = []
        self.material_map: Dict[str, int] = {}
        self.accessors: List[Dict[str, Any]] = []
        self.buffer_views: List[Dict[str, Any]] = []
        self.bin_data = bytearray()
        self.root_nodes: List[int] = []

    def add_material(
        self,
        name: str,
        color: Sequence[float] = (0.76, 0.79, 0.83, 1.0),
        metallic: float = 0.25,
        roughness: float = 0.45,
        double_sided: bool = False,
        alpha_mode: Optional[str] = None,
        extras: Optional[Dict[str, Any]] = None,
    ) -> int:
        if name in self.material_map:
            return self.material_map[name]
        rgba = list(color) if len(color) == 4 else [color[0], color[1], color[2], 1.0]
        mat: Dict[str, Any] = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [round(float(c), 4) for c in rgba],
                "metallicFactor": round(float(metallic), 4),
                "roughnessFactor": round(float(roughness), 4),
            },
        }
        if double_sided:
            mat["doubleSided"] = True
        if alpha_mode:
            mat["alphaMode"] = alpha_mode
        elif rgba[3] < 0.999:
            mat["alphaMode"] = "BLEND"
        if extras:
            mat["extras"] = extras
        idx = len(self.materials)
        self.materials.append(mat)
        self.material_map[name] = idx
        return idx

    def _push_buffer_view(self, raw: bytes, target: int) -> int:
        _align4(self.bin_data, b"\x00")
        byte_offset = len(self.bin_data)
        self.bin_data.extend(raw)
        bv_idx = len(self.buffer_views)
        self.buffer_views.append({
            "buffer": 0,
            "byteOffset": byte_offset,
            "byteLength": len(raw),
            "target": target,
        })
        return bv_idx

    def add_mesh(
        self,
        name: str,
        mesh_data: MeshData,
        material_idx: int,
        extras: Optional[Dict[str, Any]] = None,
    ) -> int:
        if not mesh_data.positions or not mesh_data.indices:
            raise ValueError(f"Mesh '{name}' has empty geometry")

        n_verts = len(mesh_data.positions)
        pos_flat = [c for p in mesh_data.positions for c in p]
        norm_flat = [c for n in mesh_data.normals for c in n]
        uv_flat = [c for uv in mesh_data.uvs for c in uv]

        xs = [p[0] for p in mesh_data.positions]
        ys = [p[1] for p in mesh_data.positions]
        zs = [p[2] for p in mesh_data.positions]
        p_min = [round(min(xs), 6), round(min(ys), 6), round(min(zs), 6)]
        p_max = [round(max(xs), 6), round(max(ys), 6), round(max(zs), 6)]

        pos_bv = self._push_buffer_view(struct.pack(f"<{len(pos_flat)}f", *pos_flat), TARGET_ARRAY_BUFFER)
        norm_bv = self._push_buffer_view(struct.pack(f"<{len(norm_flat)}f", *norm_flat), TARGET_ARRAY_BUFFER)
        uv_bv = self._push_buffer_view(struct.pack(f"<{len(uv_flat)}f", *uv_flat), TARGET_ARRAY_BUFFER)

        if n_verts <= 65535:
            idx_comp = COMPONENT_UNSIGNED_SHORT
            idx_raw = struct.pack(f"<{len(mesh_data.indices)}H", *mesh_data.indices)
        else:
            idx_comp = COMPONENT_UNSIGNED_INT
            idx_raw = struct.pack(f"<{len(mesh_data.indices)}I", *mesh_data.indices)
        idx_bv = self._push_buffer_view(idx_raw, TARGET_ELEMENT_ARRAY_BUFFER)

        pos_acc = len(self.accessors)
        self.accessors.append({
            "bufferView": pos_bv,
            "componentType": COMPONENT_FLOAT,
            "count": n_verts,
            "type": "VEC3",
            "min": p_min,
            "max": p_max,
        })
        norm_acc = len(self.accessors)
        self.accessors.append({
            "bufferView": norm_bv,
            "componentType": COMPONENT_FLOAT,
            "count": n_verts,
            "type": "VEC3",
        })
        uv_acc = len(self.accessors)
        self.accessors.append({
            "bufferView": uv_bv,
            "componentType": COMPONENT_FLOAT,
            "count": n_verts,
            "type": "VEC2",
        })
        idx_acc = len(self.accessors)
        self.accessors.append({
            "bufferView": idx_bv,
            "componentType": idx_comp,
            "count": len(mesh_data.indices),
            "type": "SCALAR",
            "min": [int(min(mesh_data.indices))],
            "max": [int(max(mesh_data.indices))],
        })

        mesh_obj: Dict[str, Any] = {
            "name": name,
            "primitives": [{
                "attributes": {
                    "POSITION": pos_acc,
                    "NORMAL": norm_acc,
                    "TEXCOORD_0": uv_acc,
                },
                "indices": idx_acc,
                "material": material_idx,
                "mode": 4,
            }],
        }
        if extras:
            mesh_obj["extras"] = extras
        m_idx = len(self.meshes)
        self.meshes.append(mesh_obj)
        return m_idx

    def add_node(
        self,
        name: str,
        parent_idx: Optional[int] = None,
        mesh_idx: Optional[int] = None,
        translation: Optional[Sequence[float]] = None,
        rotation: Optional[Sequence[float]] = None,
        scale: Optional[Sequence[float]] = None,
        extras: Optional[Dict[str, Any]] = None,
    ) -> int:
        node: Dict[str, Any] = {"name": name}
        if mesh_idx is not None:
            node["mesh"] = mesh_idx
        if translation is not None:
            node["translation"] = [round(float(v), 6) for v in translation]
        if rotation is not None:
            node["rotation"] = [round(float(v), 6) for v in rotation]
        if scale is not None:
            node["scale"] = [round(float(v), 6) for v in scale]
        if extras:
            node["extras"] = extras

        idx = len(self.nodes)
        self.nodes.append(node)
        if parent_idx is None:
            self.root_nodes.append(idx)
        else:
            parent = self.nodes[parent_idx]
            parent.setdefault("children", []).append(idx)
        return idx

    def to_glb_bytes(self) -> bytes:
        _align4(self.bin_data, b"\x00")
        gltf: Dict[str, Any] = {
            "asset": {
                "version": "2.0",
                "generator": self.generator,
            },
            "scene": 0,
            "scenes": [{
                "name": self.scene_name,
                "nodes": self.root_nodes,
            }],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.buffer_views,
            "buffers": [{"byteLength": len(self.bin_data)}],
        }
        json_bytes = bytearray(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
        _align4(json_bytes, b" ")

        total_length = 12 + 8 + len(json_bytes) + 8 + len(self.bin_data)
        header = struct.pack("<III", GLB_MAGIC, GLB_VERSION, total_length)
        chunk0 = struct.pack("<II", len(json_bytes), CHUNK_JSON) + bytes(json_bytes)
        chunk1 = struct.pack("<II", len(self.bin_data), CHUNK_BIN) + bytes(self.bin_data)
        return header + chunk0 + chunk1

    def write_glb(self, path: Path) -> Dict[str, Any]:
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = self.to_glb_bytes()
        path.write_bytes(raw)
        return validate_glb(path)


def validate_glb(path: Path) -> Dict[str, Any]:
    """Validate binary GLTF 2.0 (.glb) header, chunks, hierarchy, and buffer bounds."""
    raw = path.read_bytes()
    if len(raw) < 20:
        raise ValueError(f"GLB too short ({len(raw)} bytes)")
    magic, version, total_len = struct.unpack_from("<III", raw, 0)
    if magic != GLB_MAGIC:
        raise ValueError(f"Invalid GLB magic: 0x{magic:08x}")
    if version != GLB_VERSION:
        raise ValueError(f"Unsupported GLB version: {version}")
    if total_len != len(raw):
        raise ValueError(f"Header length {total_len} != file size {len(raw)}")

    c0_len, c0_type = struct.unpack_from("<II", raw, 12)
    if c0_type != CHUNK_JSON:
        raise ValueError(f"Chunk 0 must be JSON, got 0x{c0_type:08x}")
    gltf = json.loads(raw[20 : 20 + c0_len].decode("utf-8"))

    bin_offset = 20 + c0_len
    bin_len = 0
    if bin_offset + 8 <= len(raw):
        c1_len, c1_type = struct.unpack_from("<II", raw, bin_offset)
        if c1_type != CHUNK_BIN:
            raise ValueError(f"Chunk 1 must be BIN, got 0x{c1_type:08x}")
        bin_len = c1_len
        if bin_offset + 8 + c1_len > len(raw):
            raise ValueError("BIN chunk overflows file length")

    # Verify bufferViews stay within BIN bounds
    for i, bv in enumerate(gltf.get("bufferViews", [])):
        end = bv.get("byteOffset", 0) + bv.get("byteLength", 0)
        if end > bin_len:
            raise ValueError(f"bufferView[{i}] end {end} > BIN length {bin_len}")

    nodes = gltf.get("nodes", [])
    meshes = gltf.get("meshes", [])
    materials = gltf.get("materials", [])
    accessors = gltf.get("accessors", [])
    total_tris = 0
    total_verts = 0
    for mesh in meshes:
        for prim in mesh.get("primitives", []):
            pos_acc = accessors[prim["attributes"]["POSITION"]]
            total_verts += pos_acc["count"]
            if "indices" in prim:
                idx_acc = accessors[prim["indices"]]
                total_tris += idx_acc["count"] // 3
            else:
                total_tris += pos_acc["count"] // 3

    kinds: Dict[str, int] = {}
    for node in nodes:
        k = (node.get("extras") or {}).get("kind", "node")
        kinds[k] = kinds.get(k, 0) + 1

    return {
        "valid": True,
        "path": str(path),
        "bytes": len(raw),
        "nodes": len(nodes),
        "meshes": len(meshes),
        "materials": len(materials),
        "vertices": total_verts,
        "triangles": total_tris,
        "node_kinds": kinds,
    }


def _parse_obj(path: Path) -> List[Tuple[str, MeshData]]:
    """Pure-stdlib Wavefront OBJ parser splitting by `o` / `g` object groups."""
    verts: List[Tuple[float, float, float]] = []
    groups: Dict[str, MeshData] = {}
    current_name = path.stem

    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        cmd = parts[0]
        if cmd == "v" and len(parts) >= 4:
            verts.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif cmd in ("o", "g") and len(parts) >= 2:
            current_name = " ".join(parts[1:])
        elif cmd == "f" and len(parts) >= 4:
            mesh = groups.setdefault(current_name, MeshData())
            face_idxs: List[int] = []
            for tok in parts[1:]:
                vi = int(tok.split("/")[0])
                face_idxs.append(vi - 1 if vi > 0 else len(verts) + vi)
            for k in range(1, len(face_idxs) - 1):
                mesh.add_triangle(verts[face_idxs[0]], verts[face_idxs[k]], verts[face_idxs[k + 1]])

    return [(name, m) for name, m in groups.items() if m.triangle_count > 0]


def _parse_stl(path: Path) -> List[Tuple[str, MeshData]]:
    """Pure-stdlib binary or ASCII STL parser."""
    raw = path.read_bytes()
    mesh = MeshData()
    is_binary = False
    if len(raw) >= 84:
        tri_count = struct.unpack_from("<I", raw, 80)[0]
        if 84 + tri_count * 50 == len(raw):
            is_binary = True
            offset = 84
            for _ in range(tri_count):
                nx, ny, nz, x0, y0, z0, x1, y1, z1, x2, y2, z2 = struct.unpack_from("<12f", raw, offset)
                n = _vec_norm((nx, ny, nz)) if (nx * nx + ny * ny + nz * nz) > 1e-12 else None
                mesh.add_triangle((x0, y0, z0), (x1, y1, z1), (x2, y2, z2), n, n, n)
                offset += 50

    if not is_binary:
        text = raw.decode("utf-8", errors="replace")
        tri: List[Tuple[float, float, float]] = []
        for line in text.splitlines():
            s = line.strip()
            if s.startswith("vertex "):
                p = s.split()
                tri.append((float(p[1]), float(p[2]), float(p[3])))
                if len(tri) == 3:
                    mesh.add_triangle(tri[0], tri[1], tri[2])
                    tri = []

    return [(path.stem, mesh)] if mesh.triangle_count > 0 else []


def _parse_step_optional(path: Path, deflection: float = 0.05) -> List[Tuple[str, MeshData]]:
    """Convert STEP/STP/IGES via optional OCP (OpenCASCADE) or cadquery/trimesh if installed."""
    try:
        import cadquery as cq  # type: ignore

        shape = cq.importers.importStep(str(path))
        solids = shape.solids().vals()
        out: List[Tuple[str, MeshData]] = []
        for idx, solid in enumerate(solids):
            verts, tris = solid.tessellate(deflection)
            md = MeshData()
            for i0, i1, i2 in tris:
                v0, v1, v2 = verts[i0], verts[i1], verts[i2]
                md.add_triangle((v0.x, v0.y, v0.z), (v1.x, v1.y, v1.z), (v2.x, v2.y, v2.z))
            if md.triangle_count > 0:
                out.append((f"{path.stem}_solid_{idx + 1:02d}", md))
        if out:
            return out
    except ImportError:
        pass

    try:
        import trimesh  # type: ignore

        loaded = trimesh.load(str(path), force="scene")
        out = []
        geoms = loaded.geometry.items() if hasattr(loaded, "geometry") else [(path.stem, loaded)]
        for gname, g in geoms:
            md = MeshData()
            v = g.vertices
            for f in g.faces:
                md.add_triangle(tuple(map(float, v[f[0]])), tuple(map(float, v[f[1]])), tuple(map(float, v[f[2]])))
            if md.triangle_count > 0:
                out.append((str(gname), md))
        if out:
            return out
    except ImportError:
        pass

    raise RuntimeError(
        f"STEP/IGES ingestion for '{path.name}' requires `cadquery` (OCCT) or `trimesh` in this Python env. "
        "Export to .obj/.stl/.glb from Creo/OCCT or install cadquery to tessellate STEP directly."
    )


def ingest_cad_file(
    input_path: Path,
    output_path: Path,
    assembly_name: Optional[str] = None,
    material_code: str = "8041-4",
    standard_status: str = "locked",
    scale: float = 1.0,
    metadata_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Ingest a CAD file into an Inkworks-ready hierarchical GLB with engineering `extras`."""
    ext = input_path.suffix.lower()
    meta_overrides: Dict[str, Any] = {}
    if metadata_path and metadata_path.exists():
        meta_overrides = json.loads(metadata_path.read_text(encoding="utf-8"))

    if ext == ".glb":
        # Validate and optionally enrich existing GLB extras
        info = validate_glb(input_path)
        if input_path.resolve() != output_path.resolve():
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(input_path.read_bytes())
        return validate_glb(output_path) if output_path.exists() else info

    if ext == ".obj":
        parts = _parse_obj(input_path)
    elif ext == ".stl":
        parts = _parse_stl(input_path)
    elif ext in (".step", ".stp", ".iges", ".igs"):
        parts = _parse_step_optional(input_path)
    else:
        raise ValueError(f"Unsupported CAD format '{ext}'. Supported: .step, .stp, .iges, .obj, .stl, .glb")

    if not parts:
        raise ValueError(f"No triangle geometry extracted from {input_path}")

    asm_id = assembly_name or input_path.stem
    builder = GlbBuilder(scene_name=asm_id)
    root_idx = builder.add_node(
        name=asm_id,
        extras={
            "id": asm_id,
            "name": meta_overrides.get("name", asm_id),
            "kind": "assembly",
            "sourceFile": input_path.name,
            "scale": scale,
        },
    )

    sub_cache: Dict[str, int] = {}
    part_meta_map: Dict[str, Dict[str, Any]] = meta_overrides.get("parts", {})

    for idx, (pname, mesh_data) in enumerate(parts):
        if scale != 1.0:
            mesh_data.scale_and_translate(scale=scale)
        pmeta = part_meta_map.get(pname, {})
        sub_name = pmeta.get("subassembly", "sub_imported_cad")
        if sub_name not in sub_cache:
            sub_cache[sub_name] = builder.add_node(
                name=sub_name,
                parent_idx=root_idx,
                extras={
                    "id": sub_name,
                    "name": pmeta.get("subassemblyName", sub_name),
                    "kind": "subassembly",
                    "explodeVec": pmeta.get("subExplodeVec", [0.0, 0.0, 0.0]),
                    "stage": pmeta.get("stage", 0),
                },
            )
        mcode = pmeta.get("materialCode", material_code)
        mat_idx = builder.add_material(
            name=mcode,
            color=pmeta.get("color", (0.76, 0.79, 0.83, 1.0)),
            extras={"materialCode": mcode},
        )
        part_id = pmeta.get("id", f"part_{idx + 1:03d}_{pname}")
        extras = {
            "id": part_id,
            "name": pmeta.get("name", pname),
            "kind": "part",
            "materialCode": mcode,
            "standardStatus": pmeta.get("standardStatus", standard_status),
            "explodeVec": pmeta.get("explodeVec", [0.0, 0.0, 0.0]),
            "explodeOrder": pmeta.get("explodeOrder", idx),
            "stage": pmeta.get("stage", 0),
            "specPath": pmeta.get("specPath", f"locked_standards.role_gauge_matrix"),
        }
        mesh_idx = builder.add_mesh(pname, mesh_data, mat_idx, extras=extras)
        builder.add_node(name=part_id, parent_idx=sub_cache[sub_name], mesh_idx=mesh_idx, extras=extras)

    return builder.write_glb(output_path)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Inkworks CAD-to-GLB ingestion & validator tool")
    parser.add_argument("input", nargs="?", help="Input CAD file (.step, .stp, .obj, .stl, .glb)")
    parser.add_argument("output", nargs="?", help="Output .glb path")
    parser.add_argument("--validate", type=Path, help="Validate an existing .glb file and print stats JSON")
    parser.add_argument("--name", help="Root assembly node name")
    parser.add_argument("--material-code", default="8041-4", help="Default EMJAC ERP/material code")
    parser.add_argument("--status", default="locked", choices=["locked", "engineer_input", "buyout"])
    parser.add_argument("--scale", type=float, default=1.0, help="Uniform coordinate scale factor")
    parser.add_argument("--meta", type=Path, help="Optional JSON metadata map for subassemblies/parts")
    args = parser.parse_args(argv)

    if args.validate:
        report = validate_glb(args.validate)
        print(json.dumps(report, indent=2))
        return 0

    if not args.input or not args.output:
        parser.error("Provide <input> <output> or --validate <file.glb>")

    report = ingest_cad_file(
        Path(args.input),
        Path(args.output),
        assembly_name=args.name,
        material_code=args.material_code,
        standard_status=args.status,
        scale=args.scale,
        metadata_path=args.meta,
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

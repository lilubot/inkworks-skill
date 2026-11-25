#!/usr/bin/env python3
"""
Deterministic stdlib-only builder for EMJAC Anchor WO 087837-032 (`REF COUNTER`) GLB 2.0.

Builds a detailed, multi-level hierarchical Assembly -> Subassembly -> Part binary GLTF 2.0
(`skills/inkworks/kit/assets/counter_087837_032.glb`) with authentic sheet-metal geometry:
  - 168" overall length (>138" field-joint law, split at X=+12" into 96" Series A-D & 72" Series H-J)
  - 36" depth, 36" worktop height, 6" integral backsplash, 56" double-post overshelf
  - True cutout openings in the 14ga 304 #4 countertop for Cold Pan `1041` & Sink Bowl `1030`
  - Layered Magnetic 430 door & mullion stack (`DOOR FRONT` 18ga 304 #4 -> 1.000" Urethane `INSUL`
    -> `DOOR BACK` 18ga 430 `8285` -> Magnetic Gasket -> `GASKET FRAME` & `MULLION FRONT` 18ga 430
    -> `MULLION_BU` 20ga mill -> `1039` PVC Thermal Break)
  - 11ga structural base angles, 16ga `8300` legs with bullet/flanged feet, 18ga ends, 20ga liner,
    1.000" urethane insulation shell, 1043 lighted access apron, 1020 shelves + 14ga hat channels,
    and all 7 WO-direct buyout subsystems (Carel PJEZSNH100, RACO #232, SSOV3S130 + MKC-1, evap
    coil, faucet/drain, hinges/gaskets, LED lighting).

Run:
  python3 skills/inkworks/kit/tools/build_counter_glb.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from ingest_cad import GlbBuilder, MeshData  # noqa: E402

# 1 scene unit = 24 inches -> 168" counter = 7.0 units wide, 36" deep = 1.5 units, 36" high = 1.5 units
IN_TO_U = 1.0 / 24.0


def _s(inches: float) -> float:
    return inches * IN_TO_U


def add_box(
    mesh: MeshData,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
) -> None:
    """Add an axis-aligned box specified in inches (x0<x1, y0<y1, z0<z1) with CCW outward faces."""
    if x1 <= x0 or y1 <= y0 or z1 <= z0:
        return
    ax0, ax1 = _s(x0), _s(x1)
    ay0, ay1 = _s(y0), _s(y1)
    az0, az1 = _s(z0), _s(z1)

    # +Z front
    mesh.add_quad((ax0, ay0, az1), (ax1, ay0, az1), (ax1, ay1, az1), (ax0, ay1, az1), (0.0, 0.0, 1.0))
    # -Z back
    mesh.add_quad((ax1, ay0, az0), (ax0, ay0, az0), (ax0, ay1, az0), (ax1, ay1, az0), (0.0, 0.0, -1.0))
    # +Y top
    mesh.add_quad((ax0, ay1, az1), (ax1, ay1, az1), (ax1, ay1, az0), (ax0, ay1, az0), (0.0, 1.0, 0.0))
    # -Y bottom
    mesh.add_quad((ax0, ay0, az0), (ax1, ay0, az0), (ax1, ay0, az1), (ax0, ay0, az1), (0.0, -1.0, 0.0))
    # +X right
    mesh.add_quad((ax1, ay0, az1), (ax1, ay0, az0), (ax1, ay1, az0), (ax1, ay1, az1), (1.0, 0.0, 0.0))
    # -X left
    mesh.add_quad((ax0, ay0, az0), (ax0, ay0, az1), (ax0, ay1, az1), (ax0, ay1, az0), (-1.0, 0.0, 0.0))


def add_cylinder(
    mesh: MeshData,
    cx: float,
    cy: float,
    cz: float,
    r_bot: float,
    r_top: float,
    length: float,
    axis: str = "y",
    segs: int = 18,
    caps: bool = True,
) -> None:
    """Add a cylinder (in inches) centered along axis ('x', 'y', or 'z') from -length/2 to +length/2."""
    scx, scy, scz = _s(cx), _s(cy), _s(cz)
    rb, rt, half = _s(r_bot), _s(r_top), _s(length * 0.5)

    def _pt(u: float, v: float, w: float) -> Tuple[float, float, float]:
        if axis == "y":
            return (scx + u, scy + w, scz + v)
        if axis == "x":
            return (scx + w, scy + u, scz + v)
        return (scx + u, scy + v, scz + w)

    def _nrm(u: float, v: float, w: float) -> Tuple[float, float, float]:
        mag = math.sqrt(u * u + v * v + w * w) or 1.0
        nu, nv, nw = u / mag, v / mag, w / mag
        if axis == "y":
            return (nu, nw, nv)
        if axis == "x":
            return (nw, nu, nv)
        return (nu, nv, nw)

    slope = (rb - rt) / (2.0 * half) if half > 1e-9 else 0.0
    for i in range(segs):
        a0 = (2.0 * math.pi * i) / segs
        a1 = (2.0 * math.pi * (i + 1)) / segs
        c0, s0 = math.cos(a0), math.sin(a0)
        c1, s1 = math.cos(a1), math.sin(a1)

        # Ensure CCW outward winding for each axis orientation
        if axis == "y":
            p00 = _pt(rb * c0, rb * s0, -half)
            p10 = _pt(rb * c1, rb * s1, -half)
            p11 = _pt(rt * c1, rt * s1, half)
            p01 = _pt(rt * c0, rt * s0, half)
            # In Y-axis with (x=cos, z=sin), +theta goes from +X toward +Z (CW from +Y), so reverse for outward
            n0 = _nrm(c0, s0, slope)
            n1 = _nrm(c1, s1, slope)
            mesh.add_triangle(p00, p01, p11, n0, n0, n1)
            mesh.add_triangle(p00, p11, p10, n0, n1, n1)
            if caps:
                mesh.add_triangle(_pt(0, 0, half), p11, p01, (0.0, 1.0, 0.0), (0.0, 1.0, 0.0), (0.0, 1.0, 0.0))
                mesh.add_triangle(_pt(0, 0, -half), p00, p10, (0.0, -1.0, 0.0), (0.0, -1.0, 0.0), (0.0, -1.0, 0.0))
        elif axis == "x":
            p00 = _pt(rb * c0, rb * s0, -half)
            p10 = _pt(rb * c1, rb * s1, -half)
            p11 = _pt(rt * c1, rt * s1, half)
            p01 = _pt(rt * c0, rt * s0, half)
            n0 = _nrm(c0, s0, slope)
            n1 = _nrm(c1, s1, slope)
            mesh.add_triangle(p00, p10, p11, n0, n1, n1)
            mesh.add_triangle(p00, p11, p01, n0, n1, n0)
            if caps:
                mesh.add_triangle(_pt(0, 0, half), p01, p11, (1.0, 0.0, 0.0), (1.0, 0.0, 0.0), (1.0, 0.0, 0.0))
                mesh.add_triangle(_pt(0, 0, -half), p10, p00, (-1.0, 0.0, 0.0), (-1.0, 0.0, 0.0), (-1.0, 0.0, 0.0))
        else:  # z
            p00 = _pt(rb * c0, rb * s0, -half)
            p10 = _pt(rb * c1, rb * s1, -half)
            p11 = _pt(rt * c1, rt * s1, half)
            p01 = _pt(rt * c0, rt * s0, half)
            n0 = _nrm(c0, s0, slope)
            n1 = _nrm(c1, s1, slope)
            mesh.add_triangle(p00, p10, p11, n0, n1, n1)
            mesh.add_triangle(p00, p11, p01, n0, n1, n0)
            if caps:
                mesh.add_triangle(_pt(0, 0, half), p01, p11, (0.0, 0.0, 1.0), (0.0, 0.0, 1.0), (0.0, 0.0, 1.0))
                mesh.add_triangle(_pt(0, 0, -half), p10, p00, (0.0, 0.0, -1.0), (0.0, 0.0, -1.0), (0.0, 0.0, -1.0))


def add_plate_with_cutout(
    mesh: MeshData,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    cx0: float,
    cx1: float,
    cz0: float,
    cz1: float,
) -> None:
    """Horizontal sheet plate with a true rectangular through-cutout [cx0..cx1] x [cz0..cz1]."""
    # Left full strip
    add_box(mesh, x0, cx0, y0, y1, z0, z1)
    # Right full strip
    add_box(mesh, cx1, x1, y0, y1, z0, z1)
    # Rear strip above cutout
    add_box(mesh, cx0, cx1, y0, y1, z0, cz0)
    # Front strip below cutout
    add_box(mesh, cx0, cx1, y0, y1, cz1, z1)


def add_rect_frame_z(
    mesh: MeshData,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    border_x: float,
    border_y: float,
) -> None:
    """Vertical rectangular frame facing +Z/-Z (e.g. gasket frame, louver bezel, door back recess)."""
    add_box(mesh, x0, x1, y1 - border_y, y1, z0, z1)
    add_box(mesh, x0, x1, y0, y0 + border_y, z0, z1)
    add_box(mesh, x0, x0 + border_x, y0 + border_y, y1 - border_y, z0, z1)
    add_box(mesh, x1 - border_x, x1, y0 + border_y, y1 - border_y, z0, z1)


def add_open_top_box(
    mesh: MeshData,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    wall: float,
    rim_flange: float = 0.0,
) -> None:
    """Open-top stainless pan/sink bowl with wall thickness and optional top rim flange."""
    # Bottom
    add_box(mesh, x0, x1, y0, y0 + wall, z0, z1)
    # Left & Right walls
    add_box(mesh, x0, x0 + wall, y0 + wall, y1, z0, z1)
    add_box(mesh, x1 - wall, x1, y0 + wall, y1, z0, z1)
    # Back & Front walls
    add_box(mesh, x0 + wall, x1 - wall, y0 + wall, y1, z0, z0 + wall)
    add_box(mesh, x0 + wall, x1 - wall, y0 + wall, y1, z1 - wall, z1)
    if rim_flange > 0:
        add_plate_with_cutout(
            mesh,
            x0 - rim_flange,
            x1 + rim_flange,
            y1 - wall,
            y1,
            z0 - rim_flange,
            z1 + rim_flange,
            x0 + wall,
            x1 - wall,
            z0 + wall,
            z1 - wall,
        )


def add_door_pull(mesh: MeshData, cx: float, cy: float, z_face: float, height: float = 9.0) -> None:
    """Heavy-duty commercial refrigeration tubular pull handle mounted on +Z door face."""
    standoff = 1.6
    r_bar = 0.36
    # Vertical grip bar
    add_cylinder(mesh, cx, cy, z_face + standoff, r_bar, r_bar, height, axis="y", segs=12)
    # Top & bottom horizontal standoffs
    add_cylinder(mesh, cx, cy + height * 0.4, z_face + standoff * 0.5, 0.30, 0.30, standoff, axis="z", segs=10)
    add_cylinder(mesh, cx, cy - height * 0.4, z_face + standoff * 0.5, 0.30, 0.30, standoff, axis="z", segs=10)
    # Escutcheon mounting pads
    add_box(mesh, cx - 0.7, cx + 0.7, cy + height * 0.4 - 0.7, cy + height * 0.4 + 0.7, z_face, z_face + 0.25)
    add_box(mesh, cx - 0.7, cx + 0.7, cy - height * 0.4 - 0.7, cy - height * 0.4 + 0.7, z_face, z_face + 0.25)


def add_cam_hinge(mesh: MeshData, x: float, y: float, z: float) -> None:
    """Commercial edge-mount cam-lift hinge strap & knuckle."""
    add_box(mesh, x - 1.1, x + 1.1, y - 1.4, y + 1.4, z - 0.15, z + 0.45)
    add_cylinder(mesh, x, y, z + 0.55, 0.42, 0.42, 3.2, axis="y", segs=12)


def build_counter_glb(output_path: Path) -> Dict[str, object]:
    """Generate the complete hierarchical EMJAC WO 087837-032 Refrigerated Chef's Counter GLB."""
    b = GlbBuilder(
        scene_name="EMJAC_WO_087837_032_REF_COUNTER",
        generator="Inkworks EMJAC Counter Builder 1.0 (WO 087837-032)",
    )

    # Register EMJAC / Harmonic / SDI canonical material codes (matched 1:1 by materials.js registry!)
    mat_codes = {
        "8012-4": ((0.79, 0.82, 0.86, 1.0), 0.35, 0.35, {"erpCode": "8012-4", "gauge": "14ga", "desc": "SHEET SS 14 GA - 304 - 4"}),
        "8041-4": ((0.74, 0.78, 0.82, 1.0), 0.30, 0.40, {"erpCode": "8041-4", "gauge": "18ga", "desc": "SHEET SS 18 GA - 304 - 4"}),
        "8285": ((0.88, 0.67, 0.36, 1.0), 0.35, 0.42, {"erpCode": "8285", "gauge": "18ga", "desc": "SHEET SS 18 GA - 430 FERRITIC MAGNETIC"}),
        "8300": ((0.76, 0.80, 0.85, 1.0), 0.40, 0.30, {"erpCode": "8300", "gauge": "16ga", "desc": "TUBING ROUND SS 1-5/8\" 16GA - 3"}),
        "ss_304_11ga_angle": ((0.55, 0.60, 0.66, 1.0), 0.30, 0.55, {"erpCode": "8069-0", "gauge": "11ga", "desc": "STRUCTURAL SS 11 GA ANGLE"}),
        "ss_304_20ga_mill": ((0.64, 0.68, 0.73, 1.0), 0.25, 0.55, {"erpCode": "8050-0", "gauge": "20ga", "desc": "SHEET SS 20 GA - 304 LINER / MILL BACK-UP"}),
        "non_metal_ure": ((0.90, 0.83, 0.54, 1.0), 0.0, 0.85, {"erpCode": "INSUL-URE", "gauge": "1.000in", "desc": "1.000\" URETHANE RIGID INSULATION"}),
        "gasket_magnetic": ((0.24, 0.27, 0.32, 1.0), 0.0, 0.85, {"erpCode": "GASKET-MAG", "gauge": "0.625in", "desc": "MAGNETIC PERIMETER DOOR GASKET & 1039 BREAK"}),
        "buyout_hardware": ((0.35, 0.40, 0.47, 1.0), 0.45, 0.40, {"erpCode": "BUYOUT-HW", "desc": "COMMERCIAL HARDWARE / CAREL / HINGES / DRAIN"}),
        "buyout_copper": ((0.78, 0.52, 0.34, 1.0), 0.60, 0.35, {"erpCode": "BUYOUT-EVAP", "desc": "REFRIGERATION EVAP / COPPER COIL"}),
        "buyout_led": ((0.95, 0.96, 0.84, 1.0), 0.0, 0.30, {"erpCode": "LED-STRIP", "desc": "RACO #232 J-BOX & UNDER-SHELF / APRON LED"}),
    }
    mats: Dict[str, int] = {}
    for code, (rgba, met, rough, ex) in mat_codes.items():
        mats[code] = b.add_material(code, rgba, metallic=met, roughness=rough, extras={"materialCode": code, **ex})

    # Root Assembly Node
    root = b.add_node(
        name="asm_counter_087837_032",
        extras={
            "id": "asm_counter_087837_032",
            "name": "EMJAC Ref Counter · WO 087837-032",
            "kind": "assembly",
            "wo": "087837-032",
            "item": "A328",
            "productLine": "CN",
            "salesUsd": 81348,
            "standardStatus": "locked",
            "specPath": "product_identity",
        },
    )

    def add_sub(
        sub_id: str,
        label: str,
        section_code: str,
        explode_vec: Sequence[float],
        stage: int,
        spec_path: str,
        status: str = "locked",
    ) -> int:
        return b.add_node(
            name=sub_id,
            parent_idx=root,
            extras={
                "id": sub_id,
                "name": label,
                "kind": "subassembly",
                "sectionCode": section_code,
                "standardStatus": status,
                "explodeVec": list(explode_vec),
                "stage": stage,
                "specPath": spec_path,
            },
        )

    def add_part(
        parent: int,
        part_id: str,
        label: str,
        mesh_data: MeshData,
        mat_code: str,
        *,
        role: str,
        gauge: str,
        erp_code: str,
        so_support: str,
        status: str = "locked",
        explode_vec: Sequence[float] = (0.0, 0.0, 0.0),
        explode_order: int = 1,
        stage: int = 0,
        spec_path: str = "locked_standards",
        architectural: bool = False,
        weld_series: str = "A-D",
    ) -> int:
        extras = {
            "id": part_id,
            "name": label,
            "kind": "part",
            "role": role,
            "gauge": gauge,
            "erpCode": erp_code,
            "materialCode": mat_code,
            "soSupport": so_support,
            "standardStatus": status,
            "explodeVec": list(explode_vec),
            "explodeOrder": explode_order,
            "stage": stage,
            "specPath": spec_path,
            "architectural": architectural,
            "weldSeries": weld_series,
        }
        m_idx = b.add_mesh(part_id, mesh_data, mats[mat_code], extras=extras)
        return b.add_node(name=part_id, parent_idx=parent, mesh_idx=m_idx, extras=extras)

    # =========================================================================
    # Shared Counter Coordinates (inches)
    # X: -84 .. +84 (168" total; Field Joint at X = +12" -> 96" Left / 72" Right)
    # Y:   0 .. 36 worktop (6" legs, 6..34.5 cabinet, 34.5..36 top box, 36..42 backsplash)
    # Z: -18 .. +18 (36" total depth; +18 is operator front)
    # Cutout 1 (Cold Pan 1041): X = [-52 .. +4] (56"), Z = [-11 .. +11] (22")
    # Cutout 2 (Sink Bowl 1030): X = [+54 .. +78] (24"), Z = [-10 .. +10] (20")
    # =========================================================================
    FJ_X = 12.0
    CP_X0, CP_X1, CP_Z0, CP_Z1 = -52.0, 4.0, -11.0, 11.0
    SK_X0, SK_X1, SK_Z0, SK_Z1 = 54.0, 78.0, -10.0, 10.0

    # =========================================================================
    # 1. SUBASSEMBLY: Top Envelope (14ga 304 #4 · 8012-4 · 144" Ceiling & Field Joint)
    # =========================================================================
    sub_top = add_sub(
        "sub_top_envelope",
        "01 · Top Envelope & Field Joint (14ga 304 #4)",
        "TOP",
        [0.0, 0.65, 0.0],
        stage=0,
        spec_path="locked_standards.physics_and_sheet_laws.top_sheet_ceiling",
    )

    # Left Top Module (Series A-D: -84" to +12" = 96" <= 138" limit) with Cold Pan cutout
    m_top_l = MeshData()
    # Main top deck (0.35" visual thickness for clean silhouette/edges, representing 14ga 0.075" + stiffening)
    add_plate_with_cutout(m_top_l, -84.0, FJ_X - 0.15, 35.65, 36.0, -18.0, 18.0, CP_X0, CP_X1, CP_Z0, CP_Z1)
    # Front marine/box turned-down edge (1.5" face + 0.6" return hem)
    add_box(m_top_l, -84.0, FJ_X - 0.15, 34.5, 35.65, 17.55, 18.0)
    add_box(m_top_l, -84.0, FJ_X - 0.15, 34.5, 34.78, 16.6, 17.55)
    # Left end turned-down edge
    add_box(m_top_l, -84.0, -83.55, 34.5, 35.65, -18.0, 17.55)
    # Rear turned-down skirt under backsplash
    add_box(m_top_l, -84.0, FJ_X - 0.15, 34.5, 35.65, -18.0, -17.55)
    add_part(
        sub_top, "part_top_left", "Top Deck Series A–D (96\" · Cold Pan Cutout)", m_top_l, "8012-4",
        role="TOP", gauge="14ga (0.075\")", erp_code="8012-4", so_support="40/41 (97.6%)",
        explode_vec=[-0.12, 0.32, 0.0], explode_order=2, stage=0,
        spec_path="locked_standards.role_gauge_matrix.TOP", architectural=True, weld_series="A-D",
    )

    # Right Top Module (Series H-J: +12" to +84" = 72" <= 138" limit) with Sink cutout
    m_top_r = MeshData()
    add_plate_with_cutout(m_top_r, FJ_X + 0.15, 84.0, 35.65, 36.0, -18.0, 18.0, SK_X0, SK_X1, SK_Z0, SK_Z1)
    add_box(m_top_r, FJ_X + 0.15, 84.0, 34.5, 35.65, 17.55, 18.0)
    add_box(m_top_r, FJ_X + 0.15, 84.0, 34.5, 34.78, 16.6, 17.55)
    add_box(m_top_r, 83.55, 84.0, 34.5, 35.65, -18.0, 17.55)
    add_box(m_top_r, FJ_X + 0.15, 84.0, 34.5, 35.65, -18.0, -17.55)
    add_part(
        sub_top, "part_top_right", "Top Deck Series H–J (72\" · Sink Cutout)", m_top_r, "8012-4",
        role="TOP", gauge="14ga (0.075\")", erp_code="8012-4", so_support="40/41 (97.6%)",
        explode_vec=[0.24, 0.32, 0.0], explode_order=2, stage=0,
        spec_path="locked_standards.role_gauge_matrix.TOP", architectural=True, weld_series="H-J",
    )

    # Integral 6" Rear Backsplash with top return flange (14ga 304 #4)
    m_bs = MeshData()
    add_box(m_bs, -84.0, FJ_X - 0.15, 36.0, 42.0, -18.0, -17.45)
    add_box(m_bs, -84.0, FJ_X - 0.15, 41.6, 42.0, -17.45, -16.1)
    add_box(m_bs, FJ_X + 0.15, 84.0, 36.0, 42.0, -18.0, -17.45)
    add_box(m_bs, FJ_X + 0.15, 84.0, 41.6, 42.0, -17.45, -16.1)
    # Left & Right splash end caps
    add_box(m_bs, -84.0, -83.55, 36.0, 42.0, -17.45, -16.1)
    add_box(m_bs, 83.55, 84.0, 36.0, 42.0, -17.45, -16.1)
    add_part(
        sub_top, "part_top_backsplash", "6\" Integral Rear Backsplash (14ga)", m_bs, "8012-4",
        role="TOP", gauge="14ga (0.075\")", erp_code="8012-4", so_support="40/41 (97.6%)",
        explode_vec=[0.0, 0.55, -0.35], explode_order=3, stage=0,
        spec_path="locked_standards.role_gauge_matrix.TOP", architectural=True, weld_series="A-J",
    )

    # Field-Joint Draw-Bolt Splice Channel (>138" Shipping Split Law)
    m_fj = MeshData()
    # Visible thin seam spline & underside 14ga splice hat channel with draw-bolts
    add_box(m_fj, FJ_X - 0.18, FJ_X + 0.18, 35.68, 36.08, -17.95, 17.95)
    add_box(m_fj, FJ_X - 2.2, FJ_X + 2.2, 34.15, 35.60, -16.0, 16.0)
    for bz in (-12.0, -4.0, 4.0, 12.0):
        add_cylinder(m_fj, FJ_X, 34.45, bz, 0.35, 0.35, 5.2, axis="x", segs=10)
    add_part(
        sub_top, "part_top_field_joint", "Field-Joint Seam & Draw-Bolt Channel (>138\")", m_fj, "ss_304_11ga_angle",
        role="CHANNEL", gauge="14ga / 11ga", erp_code="8012-4", so_support="35/52 SOs (67.3% split)",
        status="engineer_input", explode_vec=[0.06, 0.14, 0.0], explode_order=1, stage=0,
        spec_path="locked_standards.physics_and_sheet_laws.top_sheet_ceiling", weld_series="SPLICE",
    )

    # Optional blank cover plates (hidden by default; shown when Engineer toggles cutouts off!)
    m_blk_cp = MeshData()
    add_box(m_blk_cp, CP_X0 - 0.1, CP_X1 + 0.1, 35.65, 36.0, CP_Z0 - 0.1, CP_Z1 + 0.1)
    add_part(
        sub_top, "part_top_blank_cold_pan", "Cold Pan Cutout Blank Insert (Optional)", m_blk_cp, "8012-4",
        role="TOP", gauge="14ga (0.075\")", erp_code="8012-4", so_support="engineer_input",
        status="engineer_input", explode_vec=[-0.12, 0.32, 0.0], explode_order=2, stage=0,
        spec_path="engineer_inputs.options.drop_in_cutouts", architectural=True,
    )

    m_blk_sk = MeshData()
    add_box(m_blk_sk, SK_X0 - 0.1, SK_X1 + 0.1, 35.65, 36.0, SK_Z0 - 0.1, SK_Z1 + 0.1)
    add_part(
        sub_top, "part_top_blank_sink", "Sink Cutout Blank Insert (Optional)", m_blk_sk, "8012-4",
        role="TOP", gauge="14ga (0.075\")", erp_code="8012-4", so_support="engineer_input",
        status="engineer_input", explode_vec=[0.24, 0.32, 0.0], explode_order=2, stage=0,
        spec_path="engineer_inputs.options.drop_in_cutouts", architectural=True,
    )

    # =========================================================================
    # 2. SUBASSEMBLY: Refrigerated Base & Structural Frame (1023 · 18ga/20ga/11ga/16ga/INSUL)
    # =========================================================================
    sub_base = add_sub(
        "sub_ref_base_1023",
        "02 · Refrigerated Base & Structure (1023)",
        "1023",
        [0.0, 0.0, 0.0],
        stage=1,
        spec_path="section_dna.1023",
    )

    # 11ga Structural Base Angle Frame (Y = 6.0 .. 7.8, Z = -15.5 .. +15.5)
    m_ang = MeshData()
    # Front & Back longitudinal angles
    add_box(m_ang, -81.0, 81.0, 6.0, 7.6, 14.4, 15.5)
    add_box(m_ang, -81.0, 81.0, 6.0, 6.4, 13.0, 15.5)
    add_box(m_ang, -81.0, 81.0, 6.0, 7.6, -15.5, -14.4)
    add_box(m_ang, -81.0, 81.0, 6.0, 6.4, -15.5, -13.0)
    # Transverse structural cross-angles at bay boundaries
    for ax in (-81.0, -59.5, -24.0, 12.0, 48.0, 80.0):
        add_box(m_ang, ax - 0.75, ax + 0.75, 6.0, 7.5, -14.4, 14.4)
    add_part(
        sub_base, "part_base_angle_frame", "11ga Structural Base Angle Sub-Frame", m_ang, "ss_304_11ga_angle",
        role="ANGLE", gauge="11ga (0.120\")", erp_code="8069-0", so_support="29/29 (100.0%)",
        explode_vec=[0.0, -0.32, 0.0], explode_order=2, stage=1,
        spec_path="locked_standards.role_gauge_matrix.ANGLE",
    )

    # 16ga 1-5/8" OD Round Stainless Legs (ERP 8300) + Bullet/Flanged Feet (2095/2358)
    m_legs = MeshData()
    leg_xs = (-79.0, -59.5, -24.0, 10.0, 14.0, 48.0, 79.0)
    for lx in leg_xs:
        for lz in (-13.2, 13.2):
            # Conical gusset socket at top
            add_cylinder(m_legs, lx, 5.55, lz, 0.95, 1.35, 1.1, axis="y", segs=14)
            # 1-5/8" OD leg tube (r=0.8125")
            add_cylinder(m_legs, lx, 3.0, lz, 0.8125, 0.8125, 4.5, axis="y", segs=16)
            # Bullet foot & flanged base pad (2095/2358)
            add_cylinder(m_legs, lx, 0.65, lz, 0.68, 0.80, 0.9, axis="y", segs=14)
            add_cylinder(m_legs, lx, 0.14, lz, 1.35, 1.35, 0.28, axis="y", segs=14)
    add_part(
        sub_base, "part_base_legs_8300", "16ga 1-5/8\" OD Tube Legs & Flanged Feet (8300)", m_legs, "8300",
        role="LEG", gauge="16ga (0.060\")", erp_code="8300", so_support="38/38 (100.0%)",
        explode_vec=[0.0, -0.62, 0.0], explode_order=3, stage=1,
        spec_path="locked_standards.role_gauge_matrix.LEG",
    )

    # 18ga 304 #4 Exterior End Panels (LH & RH) + Rear Wrapper
    m_end_l = MeshData()
    add_box(m_end_l, -81.8, -81.0, 7.6, 34.5, -16.0, 15.6)
    add_part(
        sub_base, "part_base_end_left", "LH Exterior End Panel (18ga 304 #4)", m_end_l, "8041-4",
        role="END", gauge="18ga (0.050\")", erp_code="8041-4", so_support="42/42 (100.0%)",
        explode_vec=[-0.58, 0.0, 0.0], explode_order=2, stage=1,
        spec_path="locked_standards.role_gauge_matrix.END", architectural=True,
    )

    m_end_r = MeshData()
    add_box(m_end_r, 81.0, 81.8, 7.6, 34.5, -16.0, 15.6)
    add_part(
        sub_base, "part_base_end_right", "RH Exterior End Panel (18ga 304 #4)", m_end_r, "8041-4",
        role="END", gauge="18ga (0.050\")", erp_code="8041-4", so_support="42/42 (100.0%)",
        explode_vec=[0.62, 0.0, 0.0], explode_order=2, stage=1,
        spec_path="locked_standards.role_gauge_matrix.END", architectural=True, weld_series="H-J",
    )

    m_wrap_b = MeshData()
    add_box(m_wrap_b, -81.0, 81.0, 7.6, 34.5, -16.4, -15.7)
    # Bottom wrapper pan under compressor, ref, and ambient bays
    add_box(m_wrap_b, -81.0, 48.0, 7.6, 8.15, -15.7, 15.4)
    add_part(
        sub_base, "part_base_wrapper_back", "Rear & Bottom Cabinet Wrapper (18ga 304)", m_wrap_b, "8041-4",
        role="END", gauge="18ga (0.050\")", erp_code="8041-4", so_support="42/42 (100.0%)",
        explode_vec=[0.0, 0.0, -0.58], explode_order=3, stage=1,
        spec_path="locked_standards.role_gauge_matrix.END", architectural=True,
    )

    # 1.000" Rigid Urethane Insulation Shell (INSUL · 74 qty in anchor) wrapping the 1023 Ref Bay (-59.5 .. +12.0)
    m_insul = MeshData()
    # Rear 1.0" urethane panel
    add_box(m_insul, -59.2, 11.2, 8.2, 33.4, -15.6, -14.5)
    # Bottom 1.0" urethane slab
    add_box(m_insul, -59.2, 11.2, 8.2, 9.3, -14.5, 14.3)
    # Left & Right 1.0" insulated cavity bulkheads
    add_box(m_insul, -59.5, -58.4, 9.3, 33.4, -14.5, 14.3)
    add_box(m_insul, 10.3, 11.4, 9.3, 33.4, -14.5, 14.3)
    # Upper shoulder strips flanking Cold Pan cavity
    add_box(m_insul, -58.4, 10.3, 32.3, 33.4, -14.5, -11.5)
    add_box(m_insul, -58.4, 10.3, 32.3, 33.4, 11.5, 14.3)
    add_part(
        sub_base, "part_base_insul_ure", "1.000\" Urethane Insulation Envelope (74 qty in WO)", m_insul, "non_metal_ure",
        role="INSUL", gauge="1.000\"", erp_code="INSUL-URE", so_support="19/20 (95.0% mat)",
        explode_vec=[0.0, 0.0, -0.32], explode_order=2, stage=1,
        spec_path="locked_standards.role_gauge_matrix.INSUL",
    )

    # 20ga Interior Refrigerated Liner (Back Wall + Bottom + Side Liners)
    m_liner = MeshData()
    add_box(m_liner, -58.3, 10.2, 9.35, 32.2, -14.4, -13.9)
    add_box(m_liner, -58.3, 10.2, 9.35, 9.8, -13.9, 13.8)
    add_box(m_liner, -58.3, -57.8, 9.8, 32.2, -13.9, 13.8)
    add_box(m_liner, 9.7, 10.2, 9.8, 32.2, -13.9, 13.8)
    add_part(
        sub_base, "part_base_liner_20ga", "20ga Refrigerated Cavity Liner (Back/Floor/Sides)", m_liner, "ss_304_20ga_mill",
        role="BACK WALL", gauge="20ga (0.035\")", erp_code="8050-4", so_support="30/34 (88.2% prov.)",
        explode_vec=[0.0, 0.0, -0.10], explode_order=1, stage=1,
        spec_path="locked_standards.role_gauge_matrix.BACK_WALL_AND_PARTITION",
    )

    # 20ga Structural Bay Partitions (Compressor divider, Field-Joint bulkhead, Sink bay divider)
    m_part = MeshData()
    add_box(m_part, -60.2, -59.6, 8.2, 34.4, -15.6, 15.0)
    add_box(m_part, 11.5, 12.4, 8.2, 34.4, -15.6, 15.0)
    add_box(m_part, 47.6, 48.3, 8.2, 34.4, -15.6, 15.0)
    add_part(
        sub_base, "part_base_partitions_20ga", "20ga Bay Partitions & Bulkheads", m_part, "ss_304_20ga_mill",
        role="PARTITION", gauge="20ga (0.035\")", erp_code="8050-4", so_support="20/24 (83.3% prov.)",
        explode_vec=[0.0, 0.0, 0.0], explode_order=1, stage=1,
        spec_path="locked_standards.role_gauge_matrix.BACK_WALL_AND_PARTITION",
    )

    # =========================================================================
    # 3. SUBASSEMBLY: Magnetic 430 Doors, Mullions & Thermal Break (1018, 1015, 1009, 1039)
    # =========================================================================
    sub_doors = add_sub(
        "sub_doors_mag430",
        "03 · Magnetic 430 Doors, Mullions & Thermal Break (1018/1009/1039)",
        "1018",
        [0.0, 0.0, 0.70],
        stage=2,
        spec_path="locked_standards.physics_and_sheet_laws.magnetic_430_law",
    )

    # 1039 PVC Thermal Break perimeter frame seated inside ref cavity front opening
    m_pvc = MeshData()
    add_rect_frame_z(m_pvc, -59.4, 11.4, 8.5, 31.2, 13.7, 14.35, 1.35, 1.25)
    # Vertical mullion thermal break strip at center X = -24.0
    add_box(m_pvc, -25.1, -22.9, 9.75, 29.95, 13.7, 14.35)
    add_part(
        sub_doors, "part_thermal_break_1039", "1039 PVC Thermal Break Frame", m_pvc, "gasket_magnetic",
        role="THERMAL BREAK", gauge="0.375\" PVC", erp_code="1039-PVC", so_support="15/52 SOs (6.0 pts/skel)",
        explode_vec=[0.0, 0.0, 0.14], explode_order=1, stage=2,
        spec_path="section_dna.1039",
    )

    # 20ga Mill MULLION_BU (100% 25/25 verified!) behind center mullion & jambs
    m_mbu = MeshData()
    add_box(m_mbu, -25.4, -22.6, 9.0, 30.8, 14.35, 14.75)
    add_box(m_mbu, -59.4, -57.2, 9.0, 30.8, 14.35, 14.75)
    add_box(m_mbu, 9.2, 11.4, 9.0, 30.8, 14.35, 14.75)
    add_part(
        sub_doors, "part_mullion_bu_20ga", "MULLION_BU Structural Backing (20ga Mill)", m_mbu, "ss_304_20ga_mill",
        role="MULLION_BU", gauge="20ga (0.035\")", erp_code="8050-0", so_support="25/25 (100.0%)",
        explode_vec=[0.0, 0.0, 0.28], explode_order=2, stage=2,
        spec_path="locked_standards.role_gauge_matrix.MULLION_BU",
    )

    # 18ga 430 FERRITIC MAGNETIC GASKET FRAME (17/17 = 100%)
    m_gf = MeshData()
    add_rect_frame_z(m_gf, -59.5, 11.5, 8.2, 31.4, 14.75, 15.25, 2.0, 1.7)
    add_part(
        sub_doors, "part_gasket_frame_430", "GASKET FRAME · 18ga 430 Ferritic Magnetic (8285)", m_gf, "8285",
        role="GASKET FRAME", gauge="18ga 430 MAG", erp_code="8285", so_support="17/17 (100.0%)",
        explode_vec=[0.0, 0.0, 0.42], explode_order=3, stage=2,
        spec_path="locked_standards.physics_and_sheet_laws.magnetic_430_law",
    )

    # 18ga 430 FERRITIC MAGNETIC MULLION FRONT (16/16 = 100%)
    m_mf = MeshData()
    add_box(m_mf, -25.6, -22.4, 9.9, 29.7, 14.8, 15.35)
    add_part(
        sub_doors, "part_mullion_front_430", "MULLION FRONT (1009) · 18ga 430 Magnetic (8285)", m_mf, "8285",
        role="MULLION FRONT", gauge="18ga 430 MAG", erp_code="8285", so_support="16/16 (100.0%)",
        explode_vec=[0.0, 0.0, 0.48], explode_order=3, stage=2,
        spec_path="locked_standards.physics_and_sheet_laws.magnetic_430_law",
    )

    # Left & Right Refrigerated Doors (1018) — Explodable 4-layer Magnetic 430 Sandwich!
    # Door L: X = [-58.8 .. -24.5], Y = [8.6 .. 31.0]
    # Door R: X = [-23.5 .. +10.8], Y = [8.6 .. 31.0]
    for side, dx0, dx1, hx in (
        ("l", -58.8, -24.5, -27.2),
        ("r", -23.5, 10.8, -20.8),
    ):
        tag = "LH" if side == "l" else "RH"
        # Layer A: Magnetic Perimeter Gasket
        m_gsk = MeshData()
        add_rect_frame_z(m_gsk, dx0 + 0.6, dx1 - 0.6, 9.1, 30.5, 15.30, 15.80, 0.9, 0.9)
        add_part(
            sub_doors, f"part_ref_door_{side}_gasket", f"1018 Ref Door {tag} Magnetic Gasket", m_gsk, "gasket_magnetic",
            role="GASKET", gauge="0.625\" MAG", erp_code="GASKET-MAG", so_support="47/52 (90.4%)",
            status="buyout", explode_vec=[0.0, 0.0, 0.68], explode_order=4, stage=2,
            spec_path="locked_standards.physics_and_sheet_laws.magnetic_430_law",
        )
        # Layer B: DOOR BACK = 18ga 430 Ferritic Magnetic (8285, 32/32 = 100%)
        m_db = MeshData()
        add_box(m_db, dx0 + 0.4, dx1 - 0.4, 8.9, 30.7, 15.80, 16.20)
        add_part(
            sub_doors, f"part_ref_door_{side}_back_430", f"1018 DOOR BACK {tag} · 18ga 430 Magnetic (8285)", m_db, "8285",
            role="DOOR BACK", gauge="18ga 430 MAG", erp_code="8285", so_support="32/32 (100.0%)",
            explode_vec=[0.0, 0.0, 0.88], explode_order=5, stage=2,
            spec_path="locked_standards.role_gauge_matrix.DOOR_BACK",
        )
        # Layer C: 1.000" Urethane Door Core Insulation
        m_di = MeshData()
        add_box(m_di, dx0 + 1.0, dx1 - 1.0, 9.5, 30.1, 16.20, 17.05)
        add_part(
            sub_doors, f"part_ref_door_{side}_insul", f"1018 Door {tag} 1.000\" Urethane Core", m_di, "non_metal_ure",
            role="INSUL", gauge="1.000\"", erp_code="INSUL-URE", so_support="19/20 (95.0%)",
            explode_vec=[0.0, 0.0, 1.08], explode_order=6, stage=2,
            spec_path="locked_standards.role_gauge_matrix.INSUL",
        )
        # Layer D: DOOR FRONT = 18ga 304 #4 (8041-4, 32/32 = 100%) with pan edges + commercial pull
        m_df = MeshData()
        add_box(m_df, dx0, dx1, 8.6, 31.0, 17.05, 17.45)
        # Returned pan edges wrapping around door core
        add_rect_frame_z(m_df, dx0, dx1, 8.6, 31.0, 16.15, 17.05, 0.45, 0.45)
        add_door_pull(m_df, hx, 21.5, 17.45, height=9.5)
        add_part(
            sub_doors, f"part_ref_door_{side}_front", f"1018 DOOR FRONT {tag} · 18ga 304 #4 (8041-4)", m_df, "8041-4",
            role="DOOR FRONT", gauge="18ga 304 #4", erp_code="8041-4", so_support="32/32 (100.0%)",
            explode_vec=[0.0, 0.0, 1.32], explode_order=7, stage=2,
            spec_path="locked_standards.role_gauge_matrix.DOOR_FRONT", architectural=True,
        )

    # Ambient Insulated Doors (1015) in Bay 4 (X = +13.0 .. +47.0, pair of hinged doors)
    for side, dx0, dx1, hx in (
        ("l", 13.0, 29.7, 27.6),
        ("r", 30.3, 47.0, 32.4),
    ):
        tag = "LH" if side == "l" else "RH"
        m_af = MeshData()
        add_box(m_af, dx0, dx1, 8.6, 31.0, 16.0, 17.0)
        add_door_pull(m_af, hx, 21.5, 17.0, height=8.5)
        add_part(
            sub_doors, f"part_amb_door_{side}_front", f"1015 Ambient Door {tag} (18ga 304 #4)", m_af, "8041-4",
            role="DOOR FRONT", gauge="18ga 304 #4", erp_code="8041-4", so_support="16/52 SOs (1015)",
            explode_vec=[0.18, 0.0, 0.92], explode_order=5, stage=2,
            spec_path="section_dna.1015", architectural=True, weld_series="H-J",
        )

    # =========================================================================
    # 4. SUBASSEMBLY: Insulated Drop-In Cold Pan (1041 · Pan + 8 Insul Panels + Coil)
    # =========================================================================
    sub_cp = add_sub(
        "sub_cold_pan_1041",
        "04 · Insulated Drop-In Cold Pan (1041)",
        "1041",
        [-0.08, 0.45, 0.0],
        stage=3,
        spec_path="section_dna.1041",
    )

    # Cold pan stainless well (X = -52..+4, Z = -11..+11, Y = 29.2..36.05) + hotel pan divider bars
    m_cp_pan = MeshData()
    add_open_top_box(m_cp_pan, CP_X0, CP_X1, 29.2, 36.08, CP_Z0, CP_Z1, wall=0.45, rim_flange=0.85)
    # 3 stainless hotel pan adapter divider bars spanning front-to-back inside well
    for bx in (-38.0, -24.0, -10.0):
        add_box(m_cp_pan, bx - 0.4, bx + 0.4, 34.9, 35.45, CP_Z0 + 0.45, CP_Z1 - 0.45)
    add_part(
        sub_cp, "part_cold_pan_liner_1041", "1041 Cold Pan Liner & Adapter Bars (14ga/18ga)", m_cp_pan, "8012-4",
        role="COLD PAN", gauge="14ga / 18ga", erp_code="8012-4", so_support="17/52 SOs (5.9 pts/skel)",
        explode_vec=[-0.05, 0.55, 0.0], explode_order=3, stage=3,
        spec_path="section_dna.1041",
    )

    # 8-piece Urethane Insulation Jacket wrapping 1041 Cold Pan
    m_cp_ins = MeshData()
    # Bottom 2-piece insul slabs
    add_box(m_cp_ins, CP_X0 - 1.1, -24.1, 28.0, 29.15, CP_Z0 - 1.1, CP_Z1 + 1.1)
    add_box(m_cp_ins, -23.9, CP_X1 + 1.1, 28.0, 29.15, CP_Z0 - 1.1, CP_Z1 + 1.1)
    # Front & Back insul panels (split into 2 each = 4)
    add_box(m_cp_ins, CP_X0, -24.1, 29.15, 35.1, CP_Z1 + 0.05, CP_Z1 + 1.1)
    add_box(m_cp_ins, -23.9, CP_X1, 29.15, 35.1, CP_Z1 + 0.05, CP_Z1 + 1.1)
    add_box(m_cp_ins, CP_X0, -24.1, 29.15, 35.1, CP_Z0 - 1.1, CP_Z0 - 0.05)
    add_box(m_cp_ins, -23.9, CP_X1, 29.15, 35.1, CP_Z0 - 1.1, CP_Z0 - 0.05)
    # LH & RH end insul panels (2 -> total 8 panels)
    add_box(m_cp_ins, CP_X0 - 1.1, CP_X0 - 0.05, 29.15, 35.1, CP_Z0, CP_Z1)
    add_box(m_cp_ins, CP_X1 + 0.05, CP_X1 + 1.1, 29.15, 35.1, CP_Z0, CP_Z1)
    add_part(
        sub_cp, "part_cold_pan_insul_8pc", "1041 8-Panel Urethane Thermal Jacket", m_cp_ins, "non_metal_ure",
        role="INSUL", gauge="1.000\" (8 panels)", erp_code="INSUL-URE", so_support="17/52 SOs (1041)",
        explode_vec=[-0.05, 0.25, 0.0], explode_order=2, stage=3,
        spec_path="section_dna.1041",
    )

    # Cold-wall serpentine copper evaporator tubing under Cold Pan
    m_cp_coil = MeshData()
    for cz in (-8.0, -4.0, 0.0, 4.0, 8.0):
        add_cylinder(m_cp_coil, -24.0, 27.6, cz, 0.32, 0.32, 52.0, axis="x", segs=10)
    add_cylinder(m_cp_coil, -50.0, 27.6, 0.0, 0.35, 0.35, 16.5, axis="z", segs=10)
    add_cylinder(m_cp_coil, 2.0, 27.6, 0.0, 0.35, 0.35, 16.5, axis="z", segs=10)
    add_part(
        sub_cp, "part_cold_pan_evap_coil", "1041 Cold-Wall Copper Evap Coil Interface", m_cp_coil, "buyout_copper",
        role="BUYOUT", gauge="Copper 5/8\"", erp_code="BUYOUT-EVAP", so_support="18/52 SOs (34.6%)",
        status="buyout", explode_vec=[-0.05, 0.05, 0.0], explode_order=1, stage=3,
        spec_path="buyout_subsystems.subsystems.cold_pan_hot_well",
    )

    # =========================================================================
    # 5. SUBASSEMBLY: Fabricated Sink Bowl (1030 · 14ga SINK END & EAR + Drain)
    # =========================================================================
    sub_sink = add_sub(
        "sub_sink_1030",
        "05 · Fabricated Sink Bowl (1030 · 14ga)",
        "1030",
        [0.24, 0.42, 0.0],
        stage=3,
        spec_path="section_dna.1030",
    )

    # Sink front/back/bottom shell (14ga 304 #4)
    m_sk_bowl = MeshData()
    add_box(m_sk_bowl, SK_X0 + 0.4, SK_X1 - 0.4, 24.0, 24.45, SK_Z0, SK_Z1)
    add_box(m_sk_bowl, SK_X0 + 0.4, SK_X1 - 0.4, 24.45, 36.05, SK_Z0, SK_Z0 + 0.45)
    add_box(m_sk_bowl, SK_X0 + 0.4, SK_X1 - 0.4, 24.45, 36.05, SK_Z1 - 0.45, SK_Z1)
    # Top weld flange rim
    add_plate_with_cutout(m_sk_bowl, SK_X0 - 0.7, SK_X1 + 0.7, 35.85, 36.12, SK_Z0 - 0.7, SK_Z1 + 0.7, SK_X0 + 0.45, SK_X1 - 0.45, SK_Z0 + 0.45, SK_Z1 - 0.45)
    add_part(
        sub_sink, "part_sink_bowl_1030", "1030 Fabricated Sink Bowl Wrapper (14ga 304 #4)", m_sk_bowl, "8012-4",
        role="SINK BOWL", gauge="14ga (0.075\")", erp_code="8012-4", so_support="15/52 SOs (1030)",
        explode_vec=[0.20, 0.48, 0.0], explode_order=2, stage=3,
        spec_path="section_dna.1030", weld_series="H-J",
    )

    # 14ga SINK END LH & RH (27/27 = 100% verified!)
    m_sk_ends = MeshData()
    add_box(m_sk_ends, SK_X0, SK_X0 + 0.45, 24.0, 36.05, SK_Z0, SK_Z1)
    add_box(m_sk_ends, SK_X1 - 0.45, SK_X1, 24.0, 36.05, SK_Z0, SK_Z1)
    add_part(
        sub_sink, "part_sink_ends_14ga", "1030 SINK END LH/RH (14ga 304 #4 · 100%)", m_sk_ends, "8012-4",
        role="SINK END", gauge="14ga (0.075\")", erp_code="8012-4", so_support="27/27 (100.0%)",
        explode_vec=[0.28, 0.36, 0.0], explode_order=3, stage=3,
        spec_path="locked_standards.role_gauge_matrix.SINK_END", weld_series="H-J",
    )

    # 14ga EAR Weld Gusset Flanges (24/24 = 100% verified!)
    m_sk_ears = MeshData()
    add_box(m_sk_ears, SK_X0 - 1.5, SK_X0, 33.5, 35.6, SK_Z0 - 0.3, SK_Z0 + 2.2)
    add_box(m_sk_ears, SK_X1, SK_X1 + 1.5, 33.5, 35.6, SK_Z0 - 0.3, SK_Z0 + 2.2)
    add_box(m_sk_ears, SK_X0 - 1.5, SK_X0, 33.5, 35.6, SK_Z1 - 2.2, SK_Z1 + 0.3)
    add_box(m_sk_ears, SK_X1, SK_X1 + 1.5, 33.5, 35.6, SK_Z1 - 2.2, SK_Z1 + 0.3)
    add_part(
        sub_sink, "part_sink_ears_14ga", "1030 Sink Corner EAR Flanges (14ga · 100%)", m_sk_ears, "8012-4",
        role="EAR", gauge="14ga (0.075\")", erp_code="8012-4", so_support="24/24 (100.0%)",
        explode_vec=[0.20, 0.24, 0.14], explode_order=1, stage=3,
        spec_path="locked_standards.role_gauge_matrix.EAR", weld_series="H-J",
    )

    # =========================================================================
    # 6. SUBASSEMBLY: Lighted / Access Apron (1043 · 18ga Apron + Access Panels + Louver 1019)
    # =========================================================================
    sub_apron = add_sub(
        "sub_apron_1043",
        "06 · Lighted / Access Apron (1043)",
        "1043",
        [0.0, 0.0, 0.45],
        stage=3,
        spec_path="section_dna.1043",
    )

    # Continuous Front Upper Apron Band (Y = 31.3 .. 34.5, X = -81.8 .. +81.8)
    m_apr = MeshData()
    add_box(m_apr, -81.8, 81.8, 31.3, 34.5, 15.2, 16.0)
    # Underside light-valance return lip
    add_box(m_apr, -81.8, 81.8, 31.3, 31.65, 14.3, 15.2)
    add_part(
        sub_apron, "part_apron_fascia", "1043 Upper Front Apron Band (18ga 304 #4)", m_apr, "8041-4",
        role="APRON", gauge="18ga (0.050\")", erp_code="8041-4", so_support="43/44 (97.7%)",
        explode_vec=[0.0, 0.08, 0.55], explode_order=2, stage=3,
        spec_path="locked_standards.role_gauge_matrix.APRON", architectural=True,
    )

    # Removable Front Sink Apron Access Panel (Bay 5: X = +48.5 .. +81.0, Y = 22.0 .. 31.3)
    m_acc = MeshData()
    add_box(m_acc, 48.5, 81.0, 22.0, 31.3, 15.25, 15.95)
    # Recessed finger pull & fastener tabs
    add_box(m_acc, 62.0, 67.5, 25.8, 27.4, 15.95, 16.25)
    add_part(
        sub_apron, "part_apron_access_panel", "1043 Sink Service Access Panel (18ga 304 #4)", m_acc, "8041-4",
        role="ACCESS PANEL", gauge="18ga (0.050\")", erp_code="8041-4", so_support="29/29 (100.0%)",
        explode_vec=[0.20, 0.0, 0.65], explode_order=3, stage=3,
        spec_path="locked_standards.role_gauge_matrix.ACCESS_PANEL", architectural=True, weld_series="H-J",
    )

    # Compressor Bay Louvered Access Door (1019 · Bay 1: X = -80.8 .. -60.5, Y = 8.6 .. 31.0)
    m_louv = MeshData()
    add_rect_frame_z(m_louv, -80.8, -60.5, 8.6, 31.0, 15.25, 16.05, 1.8, 2.0)
    # Horizontal ventilation louver slats
    for sy in range(12, 29, 2):
        add_box(m_louv, -78.8, -62.5, float(sy), float(sy) + 0.9, 15.45, 16.25)
    add_part(
        sub_apron, "part_compressor_louver_1019", "1019 Compressor Louvered Access Panel (18ga)", m_louv, "8041-4",
        role="ACCESS PANEL", gauge="18ga (0.050\")", erp_code="8041-4", so_support="29/29 (100.0%)",
        explode_vec=[-0.25, 0.0, 0.72], explode_order=3, stage=3,
        spec_path="locked_standards.role_gauge_matrix.ACCESS_PANEL", architectural=True,
    )

    # Under-Apron Light Valance Trim
    m_val = MeshData()
    add_box(m_val, -58.0, 46.0, 30.8, 31.35, 15.35, 15.95)
    add_part(
        sub_apron, "part_apron_light_valance", "1043 Lighted Apron Valance & Cutout Strip", m_val, "8041-4",
        role="APRON", gauge="18ga (0.050\")", erp_code="8041-4", so_support="43/44 (97.7%)",
        explode_vec=[0.0, -0.06, 0.58], explode_order=2, stage=3,
        spec_path="section_dna.1043", architectural=True,
    )

    # =========================================================================
    # 7. SUBASSEMBLY: Overshelf, Undershelf & 14ga Channels (1020)
    # =========================================================================
    sub_sh = add_sub(
        "sub_shelves_1020",
        "07 · Overshelf, Undershelf & Channels (1020)",
        "1020",
        [0.0, 0.55, 0.0],
        stage=4,
        spec_path="section_dna.1020",
    )

    # Chef's Pass Overshelf Deck (X = -76 .. +40, Z = -15 .. -1, Y = 54.6 .. 56.0) + 16ga Upright Posts
    m_osh = MeshData()
    add_box(m_osh, -76.0, 40.0, 55.65, 56.0, -15.0, -1.0)
    # Front/back/side turned-down 1.35" shelf edges
    add_box(m_osh, -76.0, 40.0, 54.65, 55.65, -1.45, -1.0)
    add_box(m_osh, -76.0, 40.0, 54.65, 55.65, -15.0, -14.55)
    add_box(m_osh, -76.0, -75.55, 54.65, 55.65, -14.55, -1.45)
    add_box(m_osh, 39.55, 40.0, 54.65, 55.65, -14.55, -1.45)
    # 3 Pairs of 16ga Tubular Mounting Posts (at X = -72, -18, +36)
    for px in (-72.0, -18.0, 36.0):
        add_cylinder(m_osh, px, 45.3, -13.0, 0.8125, 0.8125, 18.7, axis="y", segs=14)
        add_cylinder(m_osh, px, 36.2, -13.0, 1.4, 1.4, 0.35, axis="y", segs=14)
        # Cantilever support gusset arm forward under shelf
        add_box(m_osh, px - 0.6, px + 0.6, 53.7, 54.65, -13.5, -2.5)
    add_part(
        sub_sh, "part_overshelf_deck", "1020 Chef's Pass Overshelf & Posts (18ga 304 #4)", m_osh, "8041-4",
        role="SHELF", gauge="18ga (0.050\")", erp_code="8041-4", so_support="36/36 (100.0%)",
        explode_vec=[0.0, 0.72, -0.18], explode_order=3, stage=4,
        spec_path="locked_standards.role_gauge_matrix.SHELF", architectural=True,
    )

    # Interior Refrigerated & Ambient Adjustable Shelves (18ga 304 #4)
    m_ish = MeshData()
    # Ref Bay Left & Right removable wire/solid shelves at Y = 19.5
    add_box(m_ish, -56.5, -26.0, 19.2, 19.8, -12.5, 12.0)
    add_box(m_ish, -22.0, 8.5, 19.2, 19.8, -12.5, 12.0)
    # Ambient Bay 4 interior shelf at Y = 19.5
    add_box(m_ish, 13.2, 46.8, 19.2, 19.8, -14.0, 13.5)
    add_part(
        sub_sh, "part_interior_ref_shelf", "1020 Interior Adjustable Shelves (18ga 304 #4)", m_ish, "8041-4",
        role="SHELF", gauge="18ga (0.050\")", erp_code="8041-4", so_support="36/36 (100.0%)",
        explode_vec=[0.0, 0.0, 0.45], explode_order=2, stage=4,
        spec_path="locked_standards.role_gauge_matrix.SHELF",
    )

    # Open Sink Bay Undershelf (18ga 304 #4 · 22/22 = 100%)
    m_ush = MeshData()
    add_box(m_ush, 48.8, 80.5, 9.6, 10.1, -14.2, 13.8)
    add_box(m_ush, 48.8, 80.5, 8.6, 9.6, 13.35, 13.8)
    add_box(m_ush, 48.8, 80.5, 8.6, 9.6, -14.2, -13.75)
    add_part(
        sub_sh, "part_undershelf_sink_bay", "1020 Sink Bay Undershelf (18ga 304 #4)", m_ush, "8041-4",
        role="UNDERSHELF", gauge="18ga (0.050\")", erp_code="8041-4", so_support="22/22 (100.0%)",
        explode_vec=[0.24, -0.22, 0.25], explode_order=2, stage=4,
        spec_path="locked_standards.role_gauge_matrix.UNDERSHELF", architectural=True, weld_series="H-J",
    )

    # 14ga Stiffening Hat Channels under Overshelf & Countertop (28/29 = 96.6%)
    m_ch = MeshData()
    # Overshelf underside hat channel
    add_box(m_ch, -74.0, 38.0, 54.4, 55.6, -9.2, -6.8)
    # Countertop underside stiffening channels
    add_box(m_ch, -80.0, -54.0, 34.1, 35.6, -5.0, -2.5)
    add_box(m_ch, 15.0, 50.0, 34.1, 35.6, -5.0, -2.5)
    add_box(m_ch, 15.0, 50.0, 34.1, 35.6, 4.5, 7.0)
    # Undershelf hat channel
    add_box(m_ch, 50.0, 79.0, 8.4, 9.55, -1.5, 1.5)
    add_part(
        sub_sh, "part_shelf_channels_14ga", "1020 Stiffening Hat Channels (14ga · 96.6%)", m_ch, "8012-4",
        role="CHANNEL", gauge="14ga (0.075\")", erp_code="8012-4", so_support="28/29 (96.6%)",
        explode_vec=[0.0, 0.22, 0.0], explode_order=1, stage=4,
        spec_path="locked_standards.role_gauge_matrix.CHANNEL",
    )

    # =========================================================================
    # 8. SUBASSEMBLY: 7 WO-Direct Buyout Subsystems (Carel, RACO, Evap, Plumbing, LED, Hardware)
    # =========================================================================
    sub_bo = add_sub(
        "sub_buyouts",
        "08 · WO-Direct Buyout Subsystems (7 Systems · 17 Rows)",
        "BUYOUT",
        [0.0, 0.0, 0.0],
        stage=4,
        spec_path="buyout_subsystems",
        status="buyout",
    )

    # 8a. Carel PJEZSNH100 Digital Controller (Shared across 30 SOs) mounted on Compressor Bay fascia
    m_carel = MeshData()
    add_box(m_carel, -75.0, -68.5, 31.8, 34.0, 15.8, 16.6)
    # Recessed display bezel
    add_box(m_carel, -74.4, -69.1, 32.2, 33.6, 16.6, 16.85)
    # Rear controller module housing inside bay
    add_box(m_carel, -74.8, -68.7, 31.6, 34.1, 11.5, 15.8)
    add_part(
        sub_bo, "part_buyout_carel_ctrl", "Carel PJEZSNH100 Controller (30 SOs Shared)", m_carel, "buyout_hardware",
        role="BUYOUT", gauge="Buyout SKU", erp_code="PJEZSNH100", so_support="17/52 SOs (32.7%)",
        status="buyout", explode_vec=[-0.35, 0.14, 0.85], explode_order=4, stage=4,
        spec_path="buyout_subsystems.subsystems.controls_thermostat",
    )

    # 8b. Refrigeration Evap Coil + SSOV3S130 Solenoid Valve + MKC-1 Coil + Condensing Unit
    m_evap = MeshData()
    # Interior ceiling-mounted evaporator coil housing inside Ref Bay (-48 .. -28, Y = 26.5..31.5, Z = -13..-5)
    add_box(m_evap, -48.0, -28.0, 26.5, 31.6, -13.2, -5.2)
    # Dual circular fan guards on front of evap housing
    add_cylinder(m_evap, -42.5, 29.0, -5.0, 2.0, 2.0, 0.6, axis="z", segs=14)
    add_cylinder(m_evap, -33.5, 29.0, -5.0, 2.0, 2.0, 0.6, axis="z", segs=14)
    # Compressor / condensing unit inside Bay 1 (-78 .. -62, Y = 9.0..22.0, Z = -11..+8)
    add_cylinder(m_evap, -73.0, 14.5, -2.0, 4.2, 4.0, 10.5, axis="y", segs=16)
    add_box(m_evap, -67.0, -62.5, 9.5, 21.0, -9.0, 6.0)
    # SSOV3S130 Solenoid valve + MKC-1 coil block & copper suction line to evap
    add_box(m_evap, -66.5, -62.5, 23.0, 26.2, -4.0, 0.5)
    add_cylinder(m_evap, -56.0, 24.8, -2.0, 0.45, 0.45, 16.0, axis="x", segs=10)
    add_part(
        sub_bo, "part_buyout_evap_coil", "Evap Coil + SSOV3S130 Solenoid + MKC-1 Coil", m_evap, "buyout_copper",
        role="BUYOUT", gauge="Buyout SKU", erp_code="SSOV3S130 / MKC-1", so_support="19/52 SOs (36.5%)",
        status="buyout", explode_vec=[-0.42, 0.0, -0.35], explode_order=2, stage=4,
        spec_path="buyout_subsystems.subsystems.refrigeration_evap",
    )

    # 8c. Plumbing: Deck-Mount Commercial Gooseneck Faucet + Basket Strainer Drain & Tailpiece
    m_plumb = MeshData()
    fx, fz = 66.0, -13.2
    # Faucet deck flange & mixer body
    add_box(m_plumb, fx - 4.5, fx + 4.5, 36.0, 37.3, fz - 1.2, fz + 1.2)
    # Hot / Cold wrist handles
    add_cylinder(m_plumb, fx - 3.6, 38.4, fz, 0.45, 0.45, 2.2, axis="y", segs=10)
    add_box(m_plumb, fx - 6.0, fx - 3.4, 39.1, 39.6, fz - 0.35, fz + 0.35)
    add_cylinder(m_plumb, fx + 3.6, 38.4, fz, 0.45, 0.45, 2.2, axis="y", segs=10)
    add_box(m_plumb, fx + 3.4, fx + 6.0, 39.1, 39.6, fz - 0.35, fz + 0.35)
    # Gooseneck riser & forward spout over sink bowl
    add_cylinder(m_plumb, fx, 41.8, fz, 0.55, 0.55, 9.2, axis="y", segs=12)
    add_cylinder(m_plumb, fx, 46.2, fz + 3.8, 0.48, 0.48, 7.6, axis="z", segs=12)
    add_cylinder(m_plumb, fx, 44.5, fz + 7.4, 0.48, 0.42, 3.4, axis="y", segs=12)
    # Sink drain basket strainer + tailpiece + P-trap stub below sink bottom (Y=24 -> Y=13)
    add_cylinder(m_plumb, 66.0, 23.2, 0.0, 1.8, 2.2, 2.2, axis="y", segs=14)
    add_cylinder(m_plumb, 66.0, 18.0, 0.0, 0.9, 0.9, 9.2, axis="y", segs=12)
    add_cylinder(m_plumb, 66.0, 13.8, -5.5, 0.9, 0.9, 11.5, axis="z", segs=12)
    add_part(
        sub_bo, "part_buyout_sink_plumbing", "Sink Faucet, Strainer Drain & Tailpiece", m_plumb, "buyout_hardware",
        role="BUYOUT", gauge="Buyout SKU", erp_code="PLUMB-1030", so_support="24/52 SOs (46.2%)",
        status="buyout", explode_vec=[0.30, 0.62, 0.0], explode_order=4, stage=4,
        spec_path="buyout_subsystems.subsystems.plumbing_sink_drain",
    )

    # 8d. Electrical & Lighting: RACO #232 J-Box + Under-Overshelf & Apron LED Strip Luminaires
    m_elec = MeshData()
    # RACO #232 J-Box mounted in compressor bay upper rear
    add_box(m_elec, -78.0, -73.0, 26.0, 30.5, -13.5, -9.5)
    add_box(m_elec, -78.3, -72.7, 25.8, 30.7, -9.5, -9.1)
    # Conduit drop
    add_cylinder(m_elec, -75.5, 22.0, -11.5, 0.35, 0.35, 8.0, axis="y", segs=10)
    # Under-overshelf LED luminaire bar
    add_box(m_elec, -70.0, 34.0, 53.7, 54.55, -5.2, -3.2)
    # Under-apron accent LED strip
    add_box(m_elec, -56.0, 44.0, 30.5, 31.05, 14.5, 15.3)
    add_part(
        sub_bo, "part_buyout_raco_led", "RACO #232 J-Box & LED Strip Luminaires", m_elec, "buyout_led",
        role="BUYOUT", gauge="Buyout SKU", erp_code="RACO #232 / LED", so_support="21/52 SOs (40.4%)",
        status="buyout", explode_vec=[0.0, 0.45, 0.35], explode_order=3, stage=4,
        spec_path="buyout_subsystems.subsystems.electrical_lighting",
    )

    # 8e. Heavy-Duty Cam-Lift Door Hinges & Strike Hardware (5 rows in anchor · 90.4% SOs)
    m_hw = MeshData()
    for hx, hz in ((-58.9, 17.1), (10.9, 17.1), (12.9, 16.7), (47.1, 16.7)):
        add_cam_hinge(m_hw, hx, 27.8, hz)
        add_cam_hinge(m_hw, hx, 11.8, hz)
    add_part(
        sub_bo, "part_buyout_hinges_gaskets", "Cam-Lift Door Hinges & Hardware Kit (5 rows)", m_hw, "buyout_hardware",
        role="BUYOUT", gauge="Buyout SKU", erp_code="HW-HINGE-1018", so_support="47/52 SOs (90.4%)",
        status="buyout", explode_vec=[0.0, 0.0, 1.48], explode_order=8, stage=4,
        spec_path="buyout_subsystems.subsystems.doors_hardware_hinges",
    )

    return b.write_glb(output_path)


def main() -> int:
    kit_root = THIS_DIR.parent
    out_glb = kit_root / "assets" / "counter_087837_032.glb"
    report = build_counter_glb(out_glb)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

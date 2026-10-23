#!/usr/bin/env python3
"""Compare candidate screenshots against the reference with pixel/structure metrics."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.color import rgb2gray, rgb2lab
from skimage.filters import sobel
from skimage.metrics import structural_similarity as ssim_fn

W, H = 1440, 1340
MW, MH = 390, 2752

ZONES = {
    "sidebar": (0, 0, 248, 1340),
    "topbar": (248, 0, 1440, 68),
    "hero": (248, 68, 1440, 185),
    "kpis": (248, 185, 1440, 385),
    "charts": (248, 385, 1440, 835),
    "table": (248, 835, 1440, 1258),
    "footer": (248, 1258, 1440, 1340),
}

GEOMETRY_KEYS = [
    "Financial overview",
    "Total revenue",
    "$128,430",
    "Revenue",
    "$1.24M",
    "Traffic sources",
    "48.2k",
    "Recent transactions",
    "Team activity",
    "Documentation",
    "Acme Corp",
    "New report",
]


def load_norm(path: Path, width: int, height: int) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    array = np.asarray(image)
    small = Image.fromarray(array).resize((240, 240))
    quant = small.quantize(colors=6)
    palette = np.array(quant.getpalette()[:18]).reshape(6, 3)
    counts = np.bincount(np.array(quant).ravel(), minlength=6)
    background = tuple(int(v) for v in palette[counts.argmax()])
    canvas = np.full((height, width, 3), background, dtype=np.uint8)
    h = min(height, array.shape[0])
    w = min(width, array.shape[1])
    canvas[:h, :w] = array[:h, :w]
    return canvas


def ssim_rgb(a: np.ndarray, b: np.ndarray) -> float:
    scores = [
        ssim_fn(
            a[:, :, i],
            b[:, :, i],
            data_range=255,
            gaussian_weights=True,
            sigma=1.5,
            use_sample_covariance=False,
        )
        for i in range(3)
    ]
    return float(np.mean(scores))


def pixel_metrics(a: np.ndarray, b: np.ndarray) -> dict:
    diff = np.abs(a.astype(np.int16) - b.astype(np.int16))
    max_diff = diff.max(axis=2)
    mae = float(diff.mean())
    rmse = float(np.sqrt((diff.astype(np.float64) ** 2).mean()))
    return {
        "mae": round(mae, 3),
        "mae_similarity": round(1 - mae / 255, 5),
        "rmse": round(rmse, 3),
        "pixel_match_8": round(float((max_diff <= 8).mean()), 5),
        "pixel_match_16": round(float((max_diff <= 16).mean()), 5),
        "pixel_match_32": round(float((max_diff <= 32).mean()), 5),
        "pixel_match_64": round(float((max_diff <= 64).mean()), 5),
        "exact_pixels": round(float((max_diff == 0).mean()), 5),
    }


def edge_similarity(a: np.ndarray, b: np.ndarray) -> float:
    ga = rgb2gray(a / 255.0)
    gb = rgb2gray(b / 255.0)
    ea = sobel(ga).ravel()
    eb = sobel(gb).ravel()
    if ea.std() == 0 or eb.std() == 0:
        return 0.0
    corr = float(np.corrcoef(ea, eb)[0, 1])
    return round(max(0.0, corr), 5)


def palette_metrics(a: np.ndarray, b: np.ndarray, k: int = 8) -> dict:
    def lab_palette(array: np.ndarray) -> np.ndarray:
        small = Image.fromarray(array).resize((320, 320))
        quant = small.quantize(colors=k, method=Image.MEDIANCUT)
        colors = np.array(quant.getpalette()[: k * 3]).reshape(k, 3) / 255.0
        return rgb2lab(colors.reshape(1, k, 3)).reshape(k, 3)

    pa, pb = lab_palette(a), lab_palette(b)
    distances = np.linalg.norm(pa[:, None, :] - pb[None, :, :], axis=2)
    forward = distances.min(axis=1).mean()
    backward = distances.min(axis=0).mean()
    delta_e = float((forward + backward) / 2)
    return {
        "delta_e": round(delta_e, 2),
        "palette_similarity": round(max(0.0, 1 - delta_e / 50), 5),
    }


def geometry_metrics(ref_boxes: dict, cand_boxes: dict) -> dict:
    per_key = {}
    scores = []
    for key in GEOMETRY_KEYS:
        ref = ref_boxes.get(key)
        cand = cand_boxes.get(key)
        if not ref or not cand:
            per_key[key] = {"missing": "reference" if not ref else "candidate", "score": 0.0}
            scores.append(0.0)
            continue
        dx = abs(ref["x"] - cand["x"])
        dy = abs(ref["y"] - cand["y"])
        dw = abs(ref["w"] - cand["w"])
        dh = abs(ref["h"] - cand["h"])
        delta = dx + dy + dw + dh
        score = max(0.0, 1 - delta / 300)
        per_key[key] = {
            "dx": dx,
            "dy": dy,
            "dw": dw,
            "dh": dh,
            "delta": delta,
            "score": round(score, 4),
        }
        scores.append(score)
    return {
        "mean_score": round(float(np.mean(scores)), 5),
        "mean_delta_px": round(float(np.mean([v.get("delta", 300) for v in per_key.values()])), 1),
        "within_8px": int(sum(1 for v in per_key.values() if v.get("delta", 999) <= 8)),
        "within_24px": int(sum(1 for v in per_key.values() if v.get("delta", 999) <= 24)),
        "keys": per_key,
    }


def grid_analysis(a: np.ndarray, b: np.ndarray, cols: int = 12, rows: int = 8) -> dict:
    cells = []
    for row in range(rows):
        for col in range(cols):
            x0, x1 = col * W // cols, (col + 1) * W // cols
            y0, y1 = row * H // rows, (row + 1) * H // rows
            score = ssim_rgb(a[y0:y1, x0:x1], b[y0:y1, x0:x1])
            cells.append({"col": col, "row": row, "x": x0, "y": y0, "ssim": round(score, 4)})
    values = [c["ssim"] for c in cells]
    worst = sorted(cells, key=lambda c: c["ssim"])[:5]
    return {
        "mean": round(float(np.mean(values)), 5),
        "min": round(float(np.min(values)), 5),
        "max": round(float(np.max(values)), 5),
        "worst_cells": worst,
    }


def compare(ref_path: Path, cand_path: Path, out: dict) -> dict:
    ref = load_norm(ref_path, W, H)
    cand = load_norm(cand_path, W, H)
    result = {
        "ssim": round(ssim_rgb(ref, cand), 5),
        **pixel_metrics(ref, cand),
        "edge_similarity": edge_similarity(ref, cand),
        **palette_metrics(ref, cand),
        "zones": {
            name: round(ssim_rgb(ref[y0:y1, x0:x1], cand[y0:y1, x0:x1]), 5)
            for name, (x0, y0, x1, y1) in ZONES.items()
        },
        "grid": grid_analysis(ref, cand),
    }
    return result


def compare_mobile(ref_path: Path, cand_path: Path) -> dict:
    ref = load_norm(ref_path, MW, MH)
    cand = load_norm(cand_path, MW, MH)
    result = {
        "ssim": round(ssim_rgb(ref, cand), 5),
        **pixel_metrics(ref, cand),
        "edge_similarity": edge_similarity(ref, cand),
        **palette_metrics(ref, cand),
    }
    return result


def compare_fold(ref_path: Path, cand_path: Path) -> dict:
    ref = load_norm(ref_path, 390, 844)
    cand = load_norm(cand_path, 390, 844)
    return {
        "ssim": round(ssim_rgb(ref, cand), 5),
        **pixel_metrics(ref, cand),
        "edge_similarity": edge_similarity(ref, cand),
    }


def composite(metrics: dict, candidate_json: dict, mobile: dict | None) -> float:
    height = candidate_json.get("desktop", {}).get("finalScrollHeight") or H
    height_fit = max(0.0, 1 - abs(height - H) / 500)
    geo = metrics["geometry"]["mean_score"]
    score = (
        0.42 * metrics["desktop"]["ssim"]
        + 0.20 * metrics["desktop"]["pixel_match_16"]
        + 0.12 * metrics["desktop"]["edge_similarity"]
        + 0.08 * metrics["desktop"]["palette_similarity"]
        + 0.10 * geo
        + 0.08 * height_fit
    )
    return round(score * 100, 1)


def main() -> None:
    captures = Path(sys.argv[1] if len(sys.argv) > 1 else "captures")
    out_path = Path(sys.argv[2] if len(sys.argv) > 2 else "results.json")
    ref_label = "referencia"
    ref_json = json.loads((captures / f"{ref_label}.json").read_text())
    labels = [p.stem for p in captures.glob("*.json") if p.stem != ref_label]
    results = {}
    for label in sorted(labels):
        candidate_json = json.loads((captures / f"{label}.json").read_text())
        desktop_path = captures / f"{label}-desktop.png"
        mobile_path = captures / f"{label}-mobile.png"
        fold_path = captures / f"{label}-mobile-fold.png"
        entry = {"label": label}
        if desktop_path.exists():
            entry["desktop"] = compare(captures / f"{ref_label}-desktop.png", desktop_path, entry)
            entry["geometry"] = geometry_metrics(ref_json["desktop"]["boxes"], candidate_json["desktop"]["boxes"])
        if mobile_path.exists():
            entry["mobile"] = compare_mobile(captures / f"{ref_label}-mobile.png", mobile_path)
        if fold_path.exists():
            entry["mobile_fold"] = compare_fold(captures / f"{ref_label}-mobile-fold.png", fold_path)
        entry["composite"] = composite(entry, candidate_json, entry.get("mobile")) if "desktop" in entry else 0
        entry["candidate_meta"] = {
            "scrollHeight": candidate_json.get("desktop", {}).get("finalScrollHeight"),
            "mobileScrollHeight": candidate_json.get("mobile", {}).get("finalScrollHeight"),
            "overflowX": candidate_json.get("mobile", {}).get("overflowX"),
            "axeDesktop": candidate_json.get("desktop", {}).get("axe", {}).get("violationCount"),
            "axeDesktopNodes": candidate_json.get("desktop", {}).get("axe", {}).get("nodeCount"),
            "axeMobile": candidate_json.get("mobile", {}).get("axe", {}).get("violationCount"),
            "axeMobileNodes": candidate_json.get("mobile", {}).get("axe", {}).get("nodeCount"),
            "consoleErrors": candidate_json.get("consoleErrors", []),
            "themeChanged": candidate_json.get("desktop", {}).get("theme", {}).get("changed"),
            "drawerOpened": candidate_json.get("mobile", {}).get("drawer", {}).get("opened"),
            "perf": candidate_json.get("desktop", {}).get("perf", {}),
        }
        results[label] = entry

    # direct A/B comparison
    pairs = {}
    if len(results) >= 2:
        names = sorted(results)
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                a_path = captures / f"{names[i]}-desktop.png"
                b_path = captures / f"{names[j]}-desktop.png"
                if a_path.exists() and b_path.exists():
                    a = load_norm(a_path, W, H)
                    b = load_norm(b_path, W, H)
                    pairs[f"{names[i]}__vs__{names[j]}"] = {
                        "ssim": round(ssim_rgb(a, b), 5),
                        **pixel_metrics(a, b),
                    }

    payload = {"reference": ref_label, "candidates": results, "direct_pairs": pairs}
    out_path.write_text(json.dumps(payload, indent=2))
    print(json.dumps({k: {"composite": v["composite"], "ssim": v.get("desktop", {}).get("ssim")} for k, v in results.items()}, indent=2))
    print(f"written {out_path}")


if __name__ == "__main__":
    main()

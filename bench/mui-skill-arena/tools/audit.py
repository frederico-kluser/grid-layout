#!/usr/bin/env python3
"""Static + build audit for one benchmark case."""
import gzip
import json
import re
import subprocess
import sys
import time
from pathlib import Path

BANNED_PATTERNS = {
    "grid_legacy": r"GridLegacy",
    "input_props_textfield": r"<TextField\b[^>]{0,800}?\b(?:InputProps|inputProps)\s*=",
    "autocomplete_renderTags": r"\brenderTags\b",
    "menu_list_props": r"\bMenuListProps\b",
    "speeddial_tooltipTitle": r"\btooltipTitle\b",
    "dialog_disableEscapeKeyDown": r"\bdisableEscapeKeyDown\b",
    "grid_item_prop": r"<Grid\b[^>]*\bitem\b",
}

SYSTEM_STACK = r"<Stack\b[^>]{0,600}?\b(?:justifyContent|alignItems|gap|flexWrap|rowGap|columnGap)\s*="
SYSTEM_BOX = r"<Box\b[^>]{0,400}?\b(?:mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py)\s*="


def run(cmd, cwd, timeout=600):
    start = time.perf_counter()
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, shell=True)
    return {
        "cmd": cmd,
        "seconds": round(time.perf_counter() - start, 2),
        "code": proc.returncode,
        "stdout_tail": proc.stdout[-2000:],
        "stderr_tail": proc.stderr[-3000:],
    }


def installed_version(directory: Path, package: str):
    proc = subprocess.run(
        ["node", "-e", f"try{{console.log(require('{package}/package.json').version)}}catch(e){{process.exit(1)}}"],
        cwd=directory,
        capture_output=True,
        text=True,
    )
    return proc.stdout.strip() if proc.returncode == 0 else None


def main() -> None:
    label = sys.argv[1]
    case_dir = Path(sys.argv[2]).resolve()
    out_path = Path(sys.argv[3]).resolve()
    result = {"label": label, "dir": str(case_dir)}

    pkg_path = case_dir / "package.json"
    pkg = json.loads(pkg_path.read_text()) if pkg_path.exists() else None
    result["package_json"] = pkg
    result["lockfiles"] = sorted(p.name for p in case_dir.glob("*lock*"))
    result["readme"] = (case_dir / "README.md").exists()

    source_files = [
        p
        for p in case_dir.rglob("*")
        if p.is_file()
        and "node_modules" not in p.parts
        and "dist" not in p.parts
        and p.suffix in {".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".md", ".json"}
    ]
    code = ""
    for path in source_files:
        if path.suffix in {".ts", ".tsx", ".js", ".jsx", ".css", ".html"}:
            try:
                code += f"\n/* {path.relative_to(case_dir)} */\n" + path.read_text()
            except UnicodeDecodeError:
                pass

    loc = sum(1 for line in code.splitlines() if line.strip())
    result["source"] = {
        "files": len([p for p in source_files if p.suffix in {".ts", ".tsx", ".js", ".jsx", ".css"}]),
        "lines_of_code": loc,
        "bytes": len(code.encode()),
    }

    result["installed"] = {
        "mui": installed_version(case_dir, "@mui/material"),
        "icons": installed_version(case_dir, "@mui/icons-material"),
        "react": installed_version(case_dir, "react"),
        "vite": installed_version(case_dir, "vite"),
        "emotion": installed_version(case_dir, "@emotion/react"),
    }

    if not (case_dir / "node_modules").exists():
        result["install"] = run("pnpm install", case_dir, timeout=900)
    result["build"] = run("pnpm build", case_dir, timeout=600)

    dist = case_dir / "dist"
    dist_files = [p for p in dist.rglob("*") if p.is_file()] if dist.exists() else []
    js = [p for p in dist_files if p.suffix == ".js"]
    css = [p for p in dist_files if p.suffix == ".css"]
    result["dist"] = {
        "exists": dist.exists(),
        "files": len(dist_files),
        "bytes": sum(p.stat().st_size for p in dist_files),
        "js_bytes": sum(p.stat().st_size for p in js),
        "js_gzip_bytes": sum(len(gzip.compress(p.read_bytes(), 9)) for p in js),
        "css_bytes": sum(p.stat().st_size for p in css),
        "css_gzip_bytes": sum(len(gzip.compress(p.read_bytes(), 9)) for p in css),
    }

    flags = {name: len(re.findall(pattern, code, re.S)) for name, pattern in BANNED_PATTERNS.items()}
    flags["system_prop_stack"] = len(re.findall(SYSTEM_STACK, code, re.S))
    flags["system_prop_box_spacing"] = len(re.findall(SYSTEM_BOX, code, re.S))
    result["flags"] = flags

    barrel_mui = len(re.findall(r"from\s+['\"]@mui/material['\"]", code))
    barrel_icons = len(re.findall(r"from\s+['\"]@mui/icons-material['\"]", code))
    path_imports = len(re.findall(r"from\s+['\"]@mui/(?:material|icons-material)/", code))
    total = barrel_mui + barrel_icons + path_imports
    result["imports"] = {
        "path_imports": path_imports,
        "barrel_mui": barrel_mui,
        "barrel_icons": barrel_icons,
        "path_ratio": round(path_imports / total, 3) if total else None,
    }

    usage = {
        "slotProps": len(re.findall(r"\bslotProps\b", code)),
        "grid_size": len(re.findall(r"\bsize=\{\{", code)),
        "colorSchemes": len(re.findall(r"\bcolorSchemes\b", code)),
        "useColorScheme": len(re.findall(r"\buseColorScheme\b", code)),
        "CssBaseline": len(re.findall(r"\bCssBaseline\b", code)),
        "ThemeProvider": len(re.findall(r"\bThemeProvider\b", code)),
        "InitColorSchemeScript": len(re.findall(r"\bInitColorSchemeScript\b", code)),
        "fontsource_roboto": len(re.findall(r"@fontsource/roboto/", code)),
        "styled": len(re.findall(r"\bstyled\(", code)),
        "aria_label": len(re.findall(r"aria-label", code)),
        "drawer": len(re.findall(r"\bDrawer\b", code)),
        "useMediaQuery": len(re.findall(r"\buseMediaQuery\b", code)),
    }
    result["usage"] = usage
    result["viewport_meta"] = bool(re.search(r"name=[\"']viewport[\"']", code))

    checks = {
        "mui_v9": (result["installed"]["mui"] or "0").split(".")[0].isdigit()
        and int((result["installed"]["mui"] or "0").split(".")[0]) >= 9,
        "build_ok": result["build"]["code"] == 0,
        "no_barrel_imports": barrel_mui == 0 and barrel_icons == 0,
        "path_imports_ratio": (result["imports"]["path_ratio"] or 0) >= 0.9,
        "no_removed_apis": sum(flags[name] for name in BANNED_PATTERNS) == 0,
        "no_system_props": flags["system_prop_stack"] == 0 and flags["system_prop_box_spacing"] == 0,
        "theme_provider_cssbaseline": usage["ThemeProvider"] > 0 and usage["CssBaseline"] > 0,
        "color_schemes_dark": usage["colorSchemes"] > 0 and usage["useColorScheme"] > 0,
        "slot_props": usage["slotProps"] > 0,
        "fontsource": usage["fontsource_roboto"] > 0,
        "grid_v2": usage["grid_size"] > 0 or len(re.findall(r"<Grid\b", code)) == 0,
        "a11y_labels": usage["aria_label"] >= 5,
    }
    result["checks"] = checks
    result["skill_adherence"] = round(100 * sum(checks.values()) / len(checks), 1)
    result["checks_passed"] = f"{sum(checks.values())}/{len(checks)}"

    out_path.write_text(json.dumps(result, indent=2))
    print(json.dumps({k: result[k] for k in ["label", "installed", "dist", "checks", "skill_adherence"]}, indent=2))
    print(f"build code={result['build']['code']} in {result['build']['seconds']}s; written {out_path}")


if __name__ == "__main__":
    main()

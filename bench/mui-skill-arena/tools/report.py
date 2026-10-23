#!/usr/bin/env python3
"""Build the benchmark report: diff maps, comparison strip, HTML and summary JSON."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from metrics import H, W, load_norm, pixel_metrics, ssim_rgb

ROOT = Path(__file__).resolve().parent.parent
METRICS = ROOT / "metrics"
CAPTURES = METRICS / "captures"

PCT = {
    "desktop.ssim": "SSIM",
    "desktop.pixel_match_16": "Pixels até Δ16",
    "desktop.pixel_match_64": "Pixels até Δ64",
    "desktop.edge_similarity": "Similaridade de bordas",
    "desktop.palette_similarity": "Similaridade de paleta",
    "geometry.mean_score": "Geometria (12 âncoras)",
    "mobile.ssim": "SSIM mobile",
    "mobile_fold.ssim": "SSIM mobile (fold)",
}


def get(data, path, default=None):
    current = data
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def diff_map(label: str) -> Path:
    ref = load_norm(CAPTURES / "referencia-desktop.png", W, H)
    cand = load_norm(CAPTURES / f"{label}-desktop.png", W, H)
    diff = np.abs(ref.astype(np.int16) - cand.astype(np.int16)).max(axis=2)
    boosted = np.clip(diff.astype(np.float32) * 2.4, 0, 255).astype(np.uint8)
    image = ImageOps.colorize(
        Image.fromarray(boosted, "L"), black="#0b1020", white="#fee2e2", mid="#f59e0b", midpoint=64
    )
    out = METRICS / f"diff-{label}.png"
    image.save(out)
    return out


def strip(labels: list[str], out_name: str, width: int = 520) -> Path:
    images = []
    for label in ["referencia"] + labels:
        path = CAPTURES / f"{label}-desktop.png"
        if not path.exists():
            continue
        image = Image.open(path).convert("RGB")
        height = int(image.height * width / image.width)
        images.append(image.resize((width, height), Image.LANCZOS))
    if not images:
        raise SystemExit("no images")
    gap = 16
    canvas = Image.new("RGB", (width * len(images) + gap * (len(images) - 1), max(i.height for i in images)), "#ffffff")
    x = 0
    for image in images:
        canvas.paste(image, (x, 0))
        x += width + gap
    out = METRICS / out_name
    canvas.save(out)
    return out


def remove_bg(labels: list[str]) -> list[str]:
    return labels


def pct(value):
    return "—" if value is None else f"{value * 100:.1f}%"


def delta(a, b, higher=True):
    if a is None or b is None:
        return "—"
    diff = (a - b) * 100
    sign = "+" if diff >= 0 else ""
    return f"{sign}{diff:.1f} pp"


def main() -> None:
    results = json.loads((METRICS / "results.json").read_text())
    candidates = results["candidates"]
    labels = list(candidates.keys())
    audits = {}
    sessions = {}
    for label in labels:
        audit_path = METRICS / f"audit-{label}.json"
        session_path = METRICS / f"session-{label}.json"
        if audit_path.exists():
            audits[label] = json.loads(audit_path.read_text())
        if session_path.exists():
            sessions[label] = json.loads(session_path.read_text())

    for label in labels:
        diff_map(label)

    strip(labels, "strip-desktop.png")

    # build summary
    summary = {"labels": labels, "cases": {}}
    for label in labels:
        case = candidates[label]
        summary["cases"][label] = {
            "composite": case["composite"],
            "ssim": get(case, "desktop.ssim"),
            "pixel_match_16": get(case, "desktop.pixel_match_16"),
            "geometry": get(case, "geometry.mean_score"),
            "mobile_ssim": get(case, "mobile.ssim"),
            "zones": get(case, "desktop.zones"),
            "checks": audits.get(label, {}).get("checks"),
            "skill_adherence": audits.get(label, {}).get("skill_adherence"),
            "build_seconds": get(audits.get(label, {}), "build.seconds"),
            "js_gzip_kb": round((get(audits.get(label, {}), "dist.js_gzip_bytes") or 0) / 1024, 1),
            "loc": get(audits.get(label, {}), "source.lines_of_code"),
            "duration_seconds": sessions.get(label, {}).get("duration_seconds"),
            "tokens": sessions.get(label, {}).get("tokens"),
            "tool_calls": sessions.get(label, {}).get("tool_calls"),
        }
    if len(labels) == 2:
        a, b = labels
        pair = results.get("direct_pairs", {}).get(f"{a}__vs__{b}", {})
        summary["direct_pair"] = pair
        summary["composite_gap_pp"] = round(candidates[a]["composite"] - candidates[b]["composite"], 1)
    (METRICS / "summary.json").write_text(json.dumps(summary, indent=2))

    # metrics table rows
    rows = []
    for key, name in PCT.items():
        rows.append((name, key, True))
    rows += [
        ("MAE (0–255)", "desktop.mae", False),
        ("ΔE paleta (menor melhor)", "desktop.delta_e", False),
        ("Δ de altura desktop (px)", "_height_delta", False),
    ]

    metrics_table = ""
    for name, key, higher in rows:
        cells = []
        values = []
        for label in labels:
            case = candidates[label]
            if key == "_height_delta":
                value = abs((get(case, "candidate_meta.scrollHeight") or H) - H)
                text = f"{value} px"
            else:
                value = get(case, key)
                values.append(value)
                if key == "desktop.delta_e":
                    text = "—" if value is None else f"{value:.2f}"
                else:
                    text = pct(value) if isinstance(value, float) and value <= 1 else ("—" if value is None else f"{value}")
            cells.append(f"<td>{text}</td>")
        if key == "_height_delta":
            dtext = "—"
        elif key in ("desktop.mae", "desktop.delta_e"):
            dtext = f"{values[0] - values[-1]:+.2f}" if values else "—"
        else:
            dtext = delta(values[0], values[-1]) if len(values) == len(labels) else "—"
        metrics_table += f"<tr><th>{name}</th>{''.join(cells)}<td class='delta'>{dtext}</td></tr>"

    zone_table = ""
    zones = sorted((get(candidates[labels[0]], "desktop.zones") or {}).keys()) if labels else []
    for zone in zones:
        values = [get(candidates[label], f"desktop.zones.{zone}") for label in labels]
        cells = "".join(f"<td>{pct(value)}</td>" for value in values)
        zone_table += f"<tr><th>{zone}</th>{cells}<td class='delta'>{delta(values[0], values[-1])}</td></tr>"

    perf_rows = []
    perf_spec = [
        ("Build OK", "build.code", lambda v: "sim" if v == 0 else "NÃO"),
        ("Tempo de build", "build.seconds", lambda v: f"{v:.2f}s"),
        ("JS gzip", "dist.js_gzip_bytes", lambda v: f"{v / 1024:.1f} KB"),
        ("CSS gzip", "dist.css_gzip_bytes", lambda v: f"{v / 1024:.1f} KB"),
        ("Linhas de código", "source.lines_of_code", lambda v: f"{v}"),
        ("Arquivos fonte", "source.files", lambda v: f"{v}"),
        ("Instalação (se rodou)", "install.seconds", lambda v: f"{v:.1f}s" if v else "—"),
    ]
    for name, key, fmt in perf_spec:
        cells = []
        for label in labels:
            value = get(audits.get(label, {}), key)
            cells.append(f"<td>{fmt(value) if value is not None else '—'}</td>")
        perf_rows.append(f"<tr><th>{name}</th>{''.join(cells)}</tr>")

    runtime_spec = [
        ("FCP", lambda c: f"{get(c, 'candidate_meta.perf.fcp')} ms"),
        ("LCP", lambda c: f"{get(c, 'candidate_meta.perf.lcp')} ms"),
        ("Nós DOM", lambda c: f"{get(c, 'candidate_meta.perf.domNodes')}"),
        ("Nós MUI", lambda c: f"{get(c, 'candidate_meta.perf.muiNodes')}"),
        ("Erros de console", lambda c: f"{len(get(c, 'candidate_meta.consoleErrors') or [])}"),
        ("Violações axe (nós)", lambda c: f"{get(c, 'candidate_meta.axeDesktop')} ({get(c, 'candidate_meta.axeDesktopNodes', '—')})"),
        ("Overflow horizontal 390px", lambda c: "não" if not get(c, "candidate_meta.overflowX") else "SIM"),
        ("Toggle de tema funciona", lambda c: "sim" if get(c, "candidate_meta.themeChanged") else "não"),
        ("Drawer mobile abre", lambda c: "sim" if get(c, "candidate_meta.drawerOpened") else "não"),
    ]
    audits_labels = {}
    for label in labels:
        audit = audits.get(label, {})
        audits_labels[label] = f"{audit.get('checks_passed', '—')} · {audit.get('skill_adherence', '—')}%"

    runtime_table = ""
    for name, fn in runtime_spec:
        cells = "".join(f"<td>{fn(candidates[label])}</td>" for label in labels)
        runtime_table += f"<tr><th>{name}</th>{cells}</tr>"
    runtime_table += f"<tr><th>Adesão à skill (checagens)</th>{''.join(f'<td>{audits_labels[label]}</td>' for label in labels)}</tr>"

    process_table = ""
    process_spec = [
        ("Duração", lambda s: f"{(s.get('duration_seconds') or 0) / 60:.1f} min"),
        ("Passos do agente", lambda s: f"{s.get('steps')}"),
        ("Chamadas de ferramenta", lambda s: f"{s.get('tool_calls')}"),
        ("Tokens de entrada", lambda s: f"{s.get('tokens', {}).get('input_sum', 0):,}"),
        ("Tokens de saída", lambda s: f"{s.get('tokens', {}).get('output_sum', 0):,}"),
        ("Chamadas da skill", lambda s: f"{len(s.get('skill_tool_calls') or [])}"),
        ("Arquivos da skill lidos", lambda s: f"{len(s.get('skill_file_reads') or [])}"),
        ("Acessos indevidos (auditoria)", lambda s: f"{len(s.get('real_violations') or [])}"),
    ]
    for name, fn in process_spec:
        cells = "".join(f"<td>{fn(sessions.get(label, {}))}</td>" for label in labels)
        process_table += f"<tr><th>{name}</th>{cells}</tr>"

    failed_checks = ""
    for label in labels:
        checks = audits.get(label, {}).get("checks", {})
        failed = [name for name, passed in checks.items() if not passed]
        failed_checks += f"<li><strong>{label}</strong>: {', '.join(failed) if failed else 'nenhuma falha'}</li>"

    images = ""
    for label in labels:
        images += f"""
        <figure><img src="captures/{label}-desktop.png" alt="{label} desktop"><figcaption>{label} — desktop 1440×1340</figcaption></figure>
        <figure><img src="captures/{label}-mobile-fold.png" alt="{label} mobile"><figcaption>{label} — mobile 390×844 (fold) · <a href="captures/{label}-mobile.png">página completa</a></figcaption></figure>
        <figure><img src="diff-{label}.png" alt="diff {label}"><figcaption>Diferença ×2.4 contra a referência — {label}</figcaption></figure>
        """

    winner = max(labels, key=lambda label: candidates[label]["composite"]) if labels else "—"
    second = min(labels, key=lambda label: candidates[label]["composite"]) if len(labels) > 1 else None
    gap = candidates[winner]["composite"] - candidates[second]["composite"] if second else 0
    a, b = labels if len(labels) == 2 else (labels[0], labels[0])
    pair = results.get("direct_pairs", {}).get(f"{a}__vs__{b}", {})
    a_checks = audits.get(labels[0], {})
    b_checks = audits.get(labels[-1], {})
    def gzip_kb(audit):
        return round(((get(audit, "dist.js_gzip_bytes") or 0) + (get(audit, "dist.css_gzip_bytes") or 0)) / 1024, 1)
    verdict = f"""
      <p><strong>Melhor fidelidade: {winner}</strong> — composto {candidates[winner]['composite']}/100,
      {gap:+.1f} pp sobre {second}. SSIM global {pct(get(candidates[a], 'desktop.ssim'))} vs
      {pct(get(candidates[b], 'desktop.ssim'))}; píxeis até Δ16 {pct(get(candidates[a], 'desktop.pixel_match_16'))} vs
      {pct(get(candidates[b], 'desktop.pixel_match_16'))}.</p>
      <p><strong>Melhor disciplina de engenharia:</strong> {labels[0]} — adesão {a_checks.get('skill_adherence', '—')}%
      ({a_checks.get('checks_passed', '—')}) contra {b_checks.get('skill_adherence', '—')}%
      ({b_checks.get('checks_passed', '—')}); {labels[0]} não usa barrel imports e adota CSS variables/colorSchemes.</p>
      <p><strong>Peso (JS+CSS gzip):</strong> {labels[0]} {gzip_kb(a_checks)} KB vs {labels[-1]} {gzip_kb(b_checks)} KB.
      <strong>A11y (axe):</strong> {labels[0]} {get(candidates[a], 'candidate_meta.axeDesktop')} violações
      ({get(candidates[a], 'candidate_meta.axeDesktopNodes')} nós) vs {labels[-1]}
      {get(candidates[b], 'candidate_meta.axeDesktop')} ({get(candidates[b], 'candidate_meta.axeDesktopNodes')} nós).</p>
      <p><strong>Leitura:</strong> a skill não melhorou a fidelidade visual neste teste — o caso sem skill foi
      {abs(gap):.1f} pp melhor. O ganho mensurável da skill está na <em>forma</em> do código (v9 idiomático,
      CSS variables, path imports), não no resultado visual nem na acessibilidade. Semelhança direta entre os
      dois clones: SSIM {pct(pair.get('ssim'))} / {pct(pair.get('pixel_match_16'))} de píxeis até Δ16.</p>
    """

    html = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MUI Agent Skill — benchmark de fidelidade</title>
<style>
:root{{--ink:#0f172a;--muted:#5b6478;--line:#e6e8f0;--bg:#f5f6fa;--brand:#4f46e5;--teal:#0ea5a4;--good:#15803d;--bad:#b91c1c}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}}
header{{background:linear-gradient(135deg,#312e81,#4f46e5 55%,#0f766e);color:#fff;padding:44px 36px 36px}}
header h1{{margin:0 0 8px;font-size:30px;letter-spacing:-.02em}}header p{{margin:0;opacity:.88;max-width:900px}}
main{{max-width:1180px;margin:0 auto;padding:28px 20px 60px}}
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:22px 0}}
.card{{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px}}
.card .k{{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}}
.card .v{{font-size:30px;font-weight:700;letter-spacing:-.02em;margin-top:4px}}
.card .s{{font-size:12px;color:var(--muted)}}
section{{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px;margin:18px 0}}
h2{{font-size:20px;margin:0 0 14px;letter-spacing:-.01em}}h3{{font-size:15px;margin:18px 0 8px}}
table{{width:100%;border-collapse:collapse;font-size:13px}}th,td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line)}}
th{{font-weight:600;color:var(--muted)}}td.delta{{font-weight:700;color:var(--brand)}}
tr:last-child th,tr:last-child td{{border-bottom:0}}
.note{{background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:12px 14px;font-size:13px;color:#312e81}}
.figures{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}figure{{margin:0}}figure img{{width:100%;border:1px solid var(--line);border-radius:12px;display:block}}
figcaption{{font-size:12px;color:var(--muted);margin-top:6px}}
.wide{{grid-column:1/-1}}
ul{{margin:8px 0 0 18px;padding:0}}li{{margin:4px 0}}
code{{background:#f1f5f9;padding:1px 5px;border-radius:5px;font-size:12px}}
@media(max-width:800px){{.figures{{grid-template-columns:1fr}}header{{padding:30px 20px}}}}
</style></head><body>
<header><h1>MUI Agent Skill — o print vira código?</h1>
<p>Benchmark isolado: a referência foi construída com <code style="background:rgba(255,255,255,.16);color:#fff">mui-agent-skill</code> e capturada em PNG. Dois agentes independentes, mesmo modelo e mesmo briefing, tentaram reconstruí-la — um com a skill, outro sem. Medição por SSIM, píxeis, geometria, paleta, bordas, performance e auditoria do processo.</p></header>
<main>
<div class="cards">
  <div class="card"><div class="k">Referência</div><div class="v">100</div><div class="s">composto · SSIM 100%</div></div>
  <div class="card"><div class="k">{labels[0]} · com skill</div><div class="v">{candidates[labels[0]]['composite']}</div><div class="s">composto · SSIM {pct(get(candidates[labels[0]],'desktop.ssim'))}</div></div>
  <div class="card"><div class="k">{labels[1] if len(labels)>1 else '—'} · sem skill</div><div class="v">{candidates[labels[1]]['composite'] if len(labels)>1 else '—'}</div><div class="s">composto · SSIM {pct(get(candidates[labels[1]],'desktop.ssim')) if len(labels)>1 else '—'}</div></div>
  <div class="card"><div class="k">Diferença entre clones</div><div class="v">{gap:+.1f} pp</div><div class="s">a favor de {winner}</div></div>
</div>

<section><h2>Quanto nos aproximamos</h2>
<table><thead><tr><th>Métrica</th>{''.join(f'<th>{label}</th>' for label in labels)}<th>Δ ({labels[0]}−{labels[-1]})</th></tr></thead><tbody>
{metrics_table}
</tbody></table>
<p class="note">SSIM mede estrutura/luminância (1.0 = idêntico). “Pixels até Δ16” é a fração de píxeis cuja maior diferença de canal é ≤ 16/255. Geometria compara 12 âncoras de texto (posição e caixa). A coluna Δ é a diferença em pontos percentuais para métricas 0–1; MAE e ΔE aparecem em unidades próprias (menor é melhor).</p>
</section>

<section><h2>Fidelidade por região (SSIM)</h2>
<table><thead><tr><th>Região</th>{''.join(f'<th>{label}</th>' for label in labels)}<th>Δ</th></tr></thead><tbody>{zone_table}</tbody></table>
</section>

<section><h2>Como cada um performou</h2>
<table><thead><tr><th>Engenharia</th>{''.join(f'<th>{label}</th>' for label in labels)}</tr></thead><tbody>{''.join(perf_rows)}{runtime_table}</tbody></table>
<h3>Checagens de boas práticas MUI v9</h3>
<ul>{failed_checks}</ul>
<p class="note">Aderência = 12 checagens estáticas: MUI v9, build, path imports, APIs removidas, system props, ThemeProvider/CssBaseline, colorSchemes/useColorScheme, slotProps, Roboto, Grid v2, aria-labels.</p>
</section>

<section><h2>Processo</h2>
<table><thead><tr><th>Sinal</th>{''.join(f'<th>{label}</th>' for label in labels)}</tr></thead><tbody>{process_table}</tbody></table>
<p class="note">A auditoria de sessão verifica chamadas da skill, leituras de arquivos e acessos fora da pasta do caso. O caso B rodou com o symlink da skill removido do sistema; a sessão foi auditada para confirmar zero uso.</p>
</section>

<section><h2>Veredito</h2>{verdict}
</section>

<section><h2>Imagens</h2>
<div class="figures">
<figure class="wide"><img src="strip-desktop.png" alt="referência, A e B"><figcaption>Referência · {labels[0]} · {labels[1] if len(labels)>1 else ''} (1440px)</figcaption></figure>
{images}
</div>
</section>

<section><h2>Achados sobre a skill</h2>
<ul>
<li><strong>Ganho real:</strong> adesão às APIs v9 — 100% vs 75%. {a} usa 0 barrel imports; {b} usa 17. {a} usa CSS variables + <code>colorSchemes</code>; {b} recria o tema com <code>palette.mode</code> (padrão legado).</li>
<li><strong>Sem ganho visual:</strong> {b} foi {gap:.1f} pp melhor no composto e {(get(candidates[b],'desktop.ssim')-get(candidates[a],'desktop.ssim'))*100:.1f} pp melhor no SSIM. Para um modelo forte, a skill não foi o fator de fidelidade.</li>
<li><strong>A11y:</strong> {b} teve 0 violações axe; {a} teve {get(candidates[a],'candidate_meta.axeDesktopNodes')} nós de contraste. A skill pede contraste ≥4.5:1, mas não instrui rodar axe — checar foi decisão do agente.</li>
<li><strong>Peso:</strong> {a} {gzip_kb(a_checks)} KB vs {b} {gzip_kb(b_checks)} KB (JS+CSS gzip). Parte da diferença são subconjuntos de fonte carregados por {a}.</li>
<li><strong>Gap de packaging:</strong> o índice da skill referencia <code>quick-actions/</code>, mas a pasta não existe na instalação (só SKILL.md, subskills e references) — {a} relatou e não pôde usar snippets.</li>
<li><strong>Nuance de dark mode:</strong> a receita do §2 de <code>theming</code> omite que o seletor default é <code>media</code>; sem <code>colorSchemeSelector</code> (§6.3) o <code>setMode</code> não aplica. {a} configurou; {b} usou o padrão legado e também funciona.</li>
</ul></section>

<section><h2>Método</h2>
<ul>
<li>Referência: Vite + React 19 + MUI 9.5.0, construída por mim seguindo a skill; screenshots em 1440×1340 e 390×844 (Chrome headless, DPR 1).</li>
<li>Os dois agentes receberam o mesmo briefing e o mesmo PNG; a única diferença textual foi a cláusula “use a skill” vs “não use skills”.</li>
<li>Caso B: symlink <code>~/.dsh/skills/mui-agent-skill</code> removido durante a execução; sessão auditada.</li>
<li>Métricas de imagem: scikit-image SSIM (gaussiano, σ=1.5), MAE, correspondência de píxeis, correlação Sobel, ΔE de paleta e deltas de caixa de 12 âncoras.</li>
<li>Compósito: 42% SSIM + 20% pixels≤Δ16 + 12% bordas + 8% paleta + 10% geometria + 8% altura.</li>
<li>Limitação: texto e dados inventados/diferentes penalizam SSIM mesmo com layout correto; a geometria por âncoras isola parte disso.</li>
</ul>
</section>
</main></body></html>"""

    (METRICS / "report.html").write_text(html)
    print(json.dumps(summary, indent=2))
    print(f"written {METRICS / 'report.html'}")


if __name__ == "__main__":
    main()

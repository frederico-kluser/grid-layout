#!/usr/bin/env python3
"""Extract process metrics and audit the child session transcript."""
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

FORBIDDEN = {
    "agent_skills_path": r"/Agent-Skills",
    "dsh_skills_path": r"\.dsh/skills",
    "shared_screenshot_dir": r"\.\./screenshot",
    "reference_app": r"reference-app",
    "reference_src_tmp": r"orbit-reference-src",
    "other_case_a": r"caso-a-com-skill",
    "other_case_b": r"caso-b-sem-skill",
}


def main() -> None:
    label = sys.argv[1]
    session_dir = Path(sys.argv[2]).resolve()
    out_path = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else None
    transcript = session_dir / "session.v4.jsonl.zstd"
    raw = subprocess.run(["zstd", "-dc", str(transcript)], capture_output=True).stdout.decode("utf-8", "replace")
    events = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    times = [e.get("time", 0) for e in events if e.get("time")]
    start = min(times) if times else None
    end = max(times) if times else None
    tool_calls = [e["data"] for e in events if e.get("type") == "tool/call"]
    tool_names = Counter(call.get("name") for call in tool_calls)
    messages = [e["data"] for e in events if e.get("type") == "assistant/message"]

    input_tokens = sum(m.get("usage", {}).get("inputTokens", 0) for m in messages)
    output_tokens = sum(m.get("usage", {}).get("outputTokens", 0) for m in messages)
    cache_reads = sum(m.get("usage", {}).get("cacheReadTokens", 0) for m in messages)

    reads, skill_calls, bash_commands = [], [], []
    forbidden_hits = []
    for call in tool_calls:
        args = call.get("arguments", "")
        name = call.get("name")
        try:
            parsed = json.loads(args)
        except json.JSONDecodeError:
            parsed = {}
        if name == "read":
            reads.append(parsed.get("file_path"))
        if name == "skill":
            skill_calls.append(parsed)
        if name == "bash":
            bash_commands.append(parsed.get("command", ""))
        blob = f"{json.dumps(parsed, ensure_ascii=False)}"
        for key, pattern in FORBIDDEN.items():
            if re.search(pattern, blob):
                forbidden_hits.append(
                    {
                        "case": label,
                        "pattern": key,
                        "tool": name,
                        "match": re.search(pattern, blob).group(0),
                        "snippet": blob[:240],
                    }
                )

    skill_reads = [r for r in reads if r and ("skills" in r or "mui-agent-skill" in r)]
    final_text = ""
    for message in reversed(messages):
        content = message.get("message", {}).get("content", [])
        texts = [block.get("text", "") for block in content if block.get("type") == "text"]
        if texts:
            final_text = "\n".join(texts)
            break

    allowed_by_case = {
        "caso-a": {"other_case_a", "dsh_skills_path", "agent_skills_path"},
        "caso-b": {"other_case_b"},
    }
    allowed = allowed_by_case.get(label, set())
    real_violations = [hit for hit in forbidden_hits if hit["pattern"] not in allowed]
    report = {
        "label": label,
        "session": str(session_dir),
        "duration_seconds": round((end - start) / 1000, 1) if start and end else None,
        "start": start,
        "end": end,
        "steps": len(messages),
        "tool_calls": sum(tool_names.values()),
        "tool_names": dict(tool_names),
        "tokens": {
            "input_sum": input_tokens,
            "output_sum": output_tokens,
            "cache_read_sum": cache_reads,
            "max_input": max((m.get("usage", {}).get("inputTokens", 0) for m in messages), default=0),
        },
        "skill_tool_calls": skill_calls,
        "skill_file_reads": skill_reads,
        "forbidden_hits": forbidden_hits,
        "real_violations": real_violations,
        "final_text": final_text[:5000],
        "bash_commands": bash_commands,
        "reads": reads,
    }
    if out_path:
        out_path.write_text(json.dumps(report, indent=2))
    print(
        json.dumps(
            {
                "label": label,
                "duration_s": report["duration_seconds"],
                "steps": report["steps"],
                "tool_calls": report["tool_calls"],
                "tool_names": report["tool_names"],
                "tokens": report["tokens"],
                "skill_calls": len(skill_calls),
                "skill_reads": len(skill_reads),
                "forbidden_hits": forbidden_hits,
                "real_violations": len(real_violations),
        "real_violations": real_violations,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

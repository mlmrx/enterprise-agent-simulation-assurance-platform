"""Render a developer launch GIF from captured output of the published npm CLI.

Terminal pacing is edited for readability. Values come from the saved real run.
The plugin scene describes available workflows; it is not a chat recording.
"""
import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "launch/2026-09/assets"
CAPTURE = ROOT / "outputs/developer-gif"
W, H = 1200, 750
NAVY, PAPER, BLUE, GREEN = "#081b33", "#f3f7fb", "#3266cb", "#8de6b1"
MUTED, WHITE = "#a9bad0", "#edf4fc"


def font(size, mono=False, bold=False):
    name = "consolab.ttf" if mono and bold else "consola.ttf" if mono else "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def base(step, title, subtitle):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((42, 30, 84, 72), radius=12, fill=NAVY)
    d.line((54, 50, 61, 57, 73, 42), fill=GREEN, width=3)
    d.text((100, 31), "EASAP", font=font(26, bold=True), fill=NAVY)
    d.text((210, 39), "DEVELOPER TOOLS", font=font(15, mono=True), fill=BLUE)
    d.text((955, 39), "npm + Codex", font=font(18), fill=NAVY)
    d.text((48, 104), title, font=font(43, bold=True), fill=NAVY)
    d.text((50, 166), subtitle, font=font(21), fill="#526780")
    d.text((50, 695), "easap.dev/developers", font=font(19, bold=True), fill=NAVY)
    for i in range(4):
        d.rounded_rectangle((1030 + i*29, 705, 1049 + i*29, 710), radius=2, fill=BLUE if i == step else "#ced8e5")
    return im, d


def terminal(command, lines):
    im, d = base(0, "One command. Inspectable evidence.", "Run the public reference campaign with the published npm package.")
    d.rounded_rectangle((48, 217, 1152, 665), radius=18, fill=NAVY)
    for x, c in [(77, "#ff847f"), (100, "#f2cf70"), (123, GREEN)]:
        d.ellipse((x, 239, x+10, 249), fill=c)
    d.text((153, 233), "TERMINAL  /  @mlmrx/easap 0.1.0", font=font(15, mono=True), fill=MUTED)
    d.line((70, 270, 1130, 270), fill="#25405e")
    d.text((78, 289), "$ " + command, font=font(23, mono=True), fill=GREEN)
    for i, line in enumerate(lines):
        d.text((78, 334 + i*30), line, font=font(21, mono=True), fill=GREEN if "CONDITIONAL" in line else WHITE)
    return im


def evidence(payload):
    data = payload["data"]
    im, d = base(1, "Keep the evidence. Review the decision.", "Values below come from this captured run of the hosted reference engine.")
    d.rounded_rectangle((48, 218, 1152, 620), radius=18, fill=NAVY)
    d.text((79, 246), "evidence.json", font=font(19, mono=True), fill=GREEN)
    values = [
        '{',
        '  "mode": ' + json.dumps(data["mode"]) + ',',
        '  "decision": ' + json.dumps(data["decision"]["posture"]) + ',',
        '  "trials": ' + str(data["summary"]["trials"]) + ',',
        '  "passed": ' + str(data["summary"]["passed"]) + ',',
        '  "findings": ' + str(data["summary"]["findings"]) + ',',
        '  "evidenceVerified": ' + json.dumps(data["evidence"]["verified"]),
        '}',
    ]
    for i, line in enumerate(values):
        d.text((79, 292 + i*34), line, font=font(23, mono=True), fill=WHITE)
    d.text((51, 637), "Selected fields shown. Full JSON includes the run, findings, and decision evidence.", font=font(18), fill="#526780")
    return im


def plugin():
    im, d = base(2, "Bring the workflow into Codex.", "EASAP Developer plugin  /  Available workflows")
    items = [
        ("01", "Run", "Execute a reference campaign", "and explain its evidence."),
        ("02", "Plan", "Turn agent authority into", "a readiness plan."),
        ("03", "Check", "Guide ownership verification", "and public-agent probes."),
        ("04", "Review", "Inspect findings, limitations,", "and release decisions."),
    ]
    for i, (n, title, a, b) in enumerate(items):
        x, y = 48 + (i%2)*566, 221 + (i//2)*216
        d.rounded_rectangle((x, y, x+538, y+190), radius=16, fill="white", outline="#d5dfeb", width=2)
        d.text((x+24, y+23), n, font=font(18, mono=True), fill=BLUE)
        d.text((x+70, y+17), title, font=font(30, bold=True), fill=NAVY)
        d.text((x+24, y+83), a, font=font(23), fill="#526780")
        d.text((x+24, y+116), b, font=font(23), fill="#526780")
    return im


def end():
    im, d = base(3, "Start with evidence.", "CLI + JavaScript SDK + Codex plugin")
    d.rounded_rectangle((48, 229, 1152, 434), radius=18, fill=NAVY)
    d.text((85, 274), "$ npx @mlmrx/easap", font=font(43, mono=True), fill=GREEN)
    d.text((86, 356), "No account or API key needed for the reference campaign.", font=font(22), fill=WHITE)
    d.text((52, 484), "npmjs.com/package/@mlmrx/easap", font=font(27, bold=True), fill=BLUE)
    d.text((52, 536), "Point the CLI and SDK at your own host with --base-url.", font=font(23), fill=NAVY)
    d.text((52, 608), "Reference evidence; production certification is outside this demo.", font=font(20), fill="#526780")
    return im


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--capture", action="store_true")
    args = p.parse_args()
    CAPTURE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    if args.capture:
        result = subprocess.run([
            "C:/nvm4w/nodejs/node.exe", "C:/nvm4w/nodejs/node_modules/npm/bin/npx-cli.js",
            "--yes", "@mlmrx/easap@0.1.0", "demo", "--out", "evidence.json",
        ], cwd=CAPTURE, text=True, encoding="utf-8", capture_output=True, timeout=120)
        if result.returncode:
            raise RuntimeError(result.stderr)
        (CAPTURE / "transcript.txt").write_text(result.stdout, encoding="utf-8")
    output = (CAPTURE / "transcript.txt").read_text(encoding="utf-8")
    payload = json.loads((CAPTURE / "evidence.json").read_text(encoding="utf-8"))
    lines = [s.rstrip() for s in output.splitlines() if s.strip() and not s.startswith("Boundary:")]
    lines = ["Saved              ./evidence.json" if s.startswith("Saved") else s for s in lines]
    frames, durations = [], []
    command = "npx @mlmrx/easap@0.1.0 demo --out evidence.json"
    for k in range(0, len(command)+1, 2):
        frames.append(terminal(command[:k] + "_", [])); durations.append(65)
    frames.append(terminal(command, [])); durations.append(600)
    for k in range(1, len(lines)+1):
        frames.append(terminal(command, lines[:k])); durations.append(190)
    durations[-1] = 4500
    frames.extend([evidence(payload), plugin(), end()])
    durations.extend([4800, 4800, 4000])
    palette = [im.quantize(colors=128, method=Image.Quantize.MEDIANCUT) for im in frames]
    dest = OUT / "easap-developer-tools.gif"
    palette[0].save(dest, save_all=True, append_images=palette[1:], duration=durations, loop=0, optimize=True, disposal=1)
    frames[-4].save(OUT / "easap-developer-tools-poster.png")
    sheet = Image.new("RGB", (1200, 750), PAPER)
    for i, im in enumerate(frames[-4:]):
        sheet.paste(im.resize((600, 375)), ((i%2)*600, (i//2)*375))
    sheet.save(CAPTURE / "contact-sheet.png")
    with Image.open(dest) as check:
        assert check.is_animated and check.size == (1200, 750)
        total = 0
        for i in range(check.n_frames):
            check.seek(i); total += check.info.get("duration", 0)
        print(json.dumps({"gif": str(dest), "bytes": dest.stat().st_size, "frames": check.n_frames, "seconds": total/1000, "decision": payload["data"]["decision"]["posture"]}))


if __name__ == "__main__":
    main()

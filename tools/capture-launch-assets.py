"""Capture real EASAP workflows and render launch-ready GIF/MP4 assets.

Requires Python packages `playwright` and `Pillow`, plus ffmpeg on PATH. The
browser binary can be supplied with EASAP_BROWSER_PATH. No external agent is
probed: the connector recording stops at the ownership-challenge step.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import Page, sync_playwright


VIEWPORT = {"width": 1270, "height": 760}
GIF_SIZE = (960, 576)
NAVY = "#071b35"
INK = "#eaf2fb"
ACID = "#c9f46f"
MUTED = "#94a8bd"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def wait_ready(page: Page) -> None:
    page.wait_for_load_state("networkidle")
    page.add_style_tag(content="nextjs-portal { display: none !important; }")
    page.wait_for_timeout(250)


def focus(page: Page, selector: str) -> None:
    page.locator(selector).evaluate("el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' })")
    page.wait_for_timeout(250)


def capture(page: Page, path: Path) -> None:
    page.screenshot(path=str(path), animations="allow")


def title_frame(title: str, subtitle: str) -> Image.Image:
    image = Image.new("RGB", GIF_SIZE, NAVY)
    draw = ImageDraw.Draw(image)
    draw.ellipse((700, -190, 1110, 220), outline="#173d69", width=2)
    draw.ellipse((758, -132, 1052, 162), outline="#24598b", width=2)
    draw.rectangle((58, 65, 112, 69), fill=ACID)
    draw.text((58, 92), "EASAP  /  PRODUCT PROOF", fill=ACID, font=font(15, True))
    draw.multiline_text((58, 184), title, fill=INK, font=font(47, True), spacing=4)
    draw.multiline_text((58, 355), subtitle, fill=MUTED, font=font(22), spacing=7)
    draw.text((58, 518), "EVIDENCE BEFORE AUTHORITY", fill=INK, font=font(13, True))
    return image


def decorate(source: Path, label: str, detail: str) -> Image.Image:
    screenshot = Image.open(source).convert("RGB")
    # Crop to a 16:9 center canvas, then leave room for a calm product caption.
    target_ratio = 16 / 9
    width, height = screenshot.size
    crop_height = int(width / target_ratio)
    top = max(0, min(height - crop_height, 35))
    screenshot = screenshot.crop((0, top, width, top + crop_height)).resize(GIF_SIZE, Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(screenshot, "RGBA")
    draw.rounded_rectangle((22, 20, 938, 75), radius=8, fill=(7, 27, 53, 238), outline=(83, 120, 157, 180), width=1)
    draw.ellipse((43, 41, 55, 53), fill=ACID)
    draw.text((68, 32), label.upper(), fill=INK, font=font(17, True))
    detail_width = draw.textbbox((0, 0), detail, font=font(14))[2]
    draw.text((918 - detail_width, 35), detail, fill=MUTED, font=font(14))
    return screenshot


def save_poster(source: Path, output: Path, label: str, detail: str) -> None:
    image = Image.open(source).convert("RGB")
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((28, 24, 1242, 90), radius=9, fill=(7, 27, 53, 238), outline=(83, 120, 157, 180), width=1)
    draw.ellipse((52, 50, 66, 64), fill=ACID)
    draw.text((81, 37), label.upper(), fill=INK, font=font(20, True))
    detail_width = draw.textbbox((0, 0), detail, font=font(16))[2]
    draw.text((1210 - detail_width, 42), detail, fill=MUTED, font=font(16))
    image.save(output, optimize=True)


def save_gif(frames: list[Image.Image], output: Path, durations: list[int]) -> None:
    # Adaptive palettes keep UI text readable while keeping the cross-platform file compact.
    quantized = [frame.quantize(colors=112, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG) for frame in frames]
    quantized[0].save(
        output,
        save_all=True,
        append_images=quantized[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )


def gif_to_mp4(gif_path: Path, mp4_path: Path) -> bool:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return False
    subprocess.run(
        [ffmpeg, "-y", "-i", str(gif_path), "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-vf", "fps=12", str(mp4_path)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return True


def capture_readiness(page: Page, base_url: str, frames_dir: Path) -> list[Path]:
    paths: list[Path] = []
    page.goto(f"{base_url}/assess")
    wait_ready(page)
    focus(page, ".readiness-workspace")
    for index in range(2):
        path = frames_dir / f"readiness-{index:02d}.png"
        capture(page, path)
        paths.append(path)
        if index == 0:
            page.get_by_label("Agent or system name").fill("Payments Operations Agent")
            page.get_by_label("Primary use case").select_option("financial_operations")
    page.get_by_role("button", name="Generate assurance plan").click()
    page.get_by_role("button", name="Generate assurance plan").wait_for(state="visible")
    page.wait_for_timeout(250)
    path = frames_dir / "readiness-02.png"
    capture(page, path)
    paths.append(path)
    for index, tab_name in enumerate(("controls", "scenarios", "owners", "policy"), start=3):
        page.get_by_role("tab", name=tab_name).click()
        page.wait_for_timeout(180)
        path = frames_dir / f"readiness-{index:02d}.png"
        capture(page, path)
        paths.append(path)
    return paths


def capture_connector(page: Page, base_url: str, frames_dir: Path) -> list[Path]:
    paths: list[Path] = []
    page.goto(f"{base_url}/connect")
    wait_ready(page)
    focus(page, ".connector-workspace")
    path = frames_dir / "connector-00.png"
    capture(page, path)
    paths.append(path)
    page.get_by_label("Agent name").fill("Public Support Agent")
    page.get_by_label("Public HTTPS endpoint").fill("https://example.com/agent")
    page.get_by_label("Request contract").select_option("json_message")
    page.get_by_label("Model or agent ID").fill("support-agent-v1")
    path = frames_dir / "connector-01.png"
    capture(page, path)
    paths.append(path)
    page.get_by_text("I own or am explicitly authorized").click()
    page.get_by_text("This endpoint is safe for bounded").click()
    path = frames_dir / "connector-02.png"
    capture(page, path)
    paths.append(path)
    page.get_by_role("button", name="Create ownership challenge").click()
    page.get_by_role("heading", name="Publish one temporary challenge.").wait_for(timeout=10_000)
    focus(page, ".verification-panel")
    page.wait_for_timeout(220)
    path = frames_dir / "connector-03.png"
    capture(page, path)
    paths.append(path)
    return paths


def capture_campaign(page: Page, base_url: str, frames_dir: Path) -> list[Path]:
    paths: list[Path] = []
    page.goto(f"{base_url}/platform")
    wait_ready(page)
    focus(page, ".proof-console")
    path = frames_dir / "campaign-00.png"
    capture(page, path)
    paths.append(path)
    page.get_by_role("button", name="Run live campaign").click()
    for index, delay in enumerate((180, 680, 680, 680), start=1):
        page.wait_for_timeout(delay)
        path = frames_dir / f"campaign-{index:02d}.png"
        capture(page, path)
        paths.append(path)
    page.locator(".proof-result").wait_for(timeout=15_000)
    path = frames_dir / "campaign-05.png"
    capture(page, path)
    paths.append(path)
    return paths


def capture_guides(page: Page, base_url: str, frames_dir: Path) -> list[Path]:
    paths: list[Path] = []
    page.goto(f"{base_url}/guides")
    wait_ready(page)
    path = frames_dir / "guides-00.png"
    capture(page, path)
    paths.append(path)
    focus(page, ".guide-card-grid")
    path = frames_dir / "guides-01.png"
    capture(page, path)
    paths.append(path)
    page.goto(f"{base_url}/guides/security-red-team")
    wait_ready(page)
    path = frames_dir / "guides-02.png"
    capture(page, path)
    paths.append(path)
    page.evaluate("window.scrollBy(0, 430)")
    page.wait_for_timeout(180)
    path = frames_dir / "guides-03.png"
    capture(page, path)
    paths.append(path)
    return paths


def build_assets(base_url: str, output: Path, browser_path: str) -> None:
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="easap-launch-") as temp:
        frames_dir = Path(temp)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, executable_path=browser_path)
            page = browser.new_page(viewport=VIEWPORT, device_scale_factor=1)
            readiness = capture_readiness(page, base_url, frames_dir)
            connector = capture_connector(page, base_url, frames_dir)
            campaign = capture_campaign(page, base_url, frames_dir)
            guides = capture_guides(page, base_url, frames_dir)
            browser.close()

        sequences = [
            (
                "readiness-planner",
                "Agent Release Readiness Planner",
                "Describe authority. Generate controls, scenarios, owners, and a release gate.",
                readiness,
                [1500, 900, 1700, 900, 900, 900, 1800],
                "IMMEDIATE UTILITY",
                "Risk → controls → scenarios → gate",
            ),
            (
                "public-agent-connector",
                "Verified public-agent connector",
                "Authorization first. Bounded black-box evidence second.",
                connector,
                [1600, 1100, 1100, 2300],
                "PUBLIC AGENT BASELINE",
                "No credential intake",
            ),
            (
                "live-assurance-campaign",
                "Executable assurance campaign",
                "Seeded trials, mediated effects, findings, uncertainty, and decision evidence.",
                campaign,
                [1600, 700, 700, 700, 700, 2400],
                "LIVE REFERENCE CAMPAIGN",
                "No canned success fallback",
            ),
            (
                "role-guides",
                "One evidence chain. Different jobs.",
                "Operating guides for engineering, security, governance, and release teams.",
                guides,
                [1500, 1600, 1700, 2200],
                "FUNCTION-SPECIFIC GUIDES",
                "Workflows and handoffs",
            ),
        ]

        built: dict[str, list[Image.Image]] = {}
        for slug, title, subtitle, sources, durations, label, detail in sequences:
            frames = [title_frame(title, subtitle)] + [decorate(path, label, detail) for path in sources]
            full_durations = [1900] + durations
            gif_path = output / f"{slug}.gif"
            save_gif(frames, gif_path, full_durations)
            gif_to_mp4(gif_path, output / f"{slug}.mp4")
            save_poster(sources[-1], output / f"{slug}-poster.png", label, detail)
            built[slug] = frames

        hero_frames = [
            title_frame("Know what your AI agent will do\nbefore you let it act.", "EASAP turns authority into tests, evidence, and a bounded release decision."),
            built["readiness-planner"][-1],
            built["public-agent-connector"][-1],
            built["live-assurance-campaign"][-1],
            built["role-guides"][-1],
            title_frame("Evidence before authority.", "Assess. Challenge. Inspect. Decide. Run locally or on your preferred host."),
        ]
        hero_gif = output / "easap-launch-hero.gif"
        save_gif(hero_frames, hero_gif, [2100, 1500, 1500, 1800, 1400, 2300])
        gif_to_mp4(hero_gif, output / "easap-launch-hero.mp4")

        thumbnail_frames = []
        for frame in (hero_frames[0], hero_frames[1], hero_frames[3], hero_frames[-1]):
            square = frame.crop((192, 0, 768, 576)).resize((240, 240), Image.Resampling.LANCZOS)
            thumbnail_frames.append(square)
        save_gif(thumbnail_frames, output / "easap-thumbnail-240.gif", [1500, 1100, 1100, 1700])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:3000")
    parser.add_argument("--output", default="launch/2026-09/assets")
    parser.add_argument("--browser", default=os.environ.get("EASAP_BROWSER_PATH", "C:/Program Files/Google/Chrome/Application/chrome.exe"))
    args = parser.parse_args()
    browser_path = Path(args.browser)
    if not browser_path.exists():
        raise SystemExit(f"Browser not found: {browser_path}")
    build_assets(args.base_url.rstrip("/"), Path(args.output), str(browser_path))


if __name__ == "__main__":
    main()

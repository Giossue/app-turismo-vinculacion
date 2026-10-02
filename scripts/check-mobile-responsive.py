#!/usr/bin/env python3
"""Exercise the isolated mobile QA harness on an already running Android emulator.

Requires Python 3, adb, an installed development APK and the QA Metro server.
Does not install software, clear app data, request permissions or contact the API.
ADB reference: https://developer.android.com/tools/adb
"""

from __future__ import annotations

import argparse
from decimal import Decimal, InvalidOperation
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
import xml.etree.ElementTree as ET


PACKAGE = "ec.edu.ueb.turismovinculacion.software.dev"
SCREENS = ("tabs", "chat", "route", "form", "search")
DEFAULT_MATRIX = (
    "320x568:1,360x640:1,390x844:1,412x915:1,640x360:1,844x390:1,"
    "360x640:1.5,320x568:2,640x360:2"
)
METRICS_RE = re.compile(r"QA_METRICS:(\w+):([\d.]+):([\d.]+):([\d.]+)")
BOUNDS_RE = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")


class Adb:
    def __init__(self, serial: str):
        self.prefix = [shutil.which("adb") or "adb", "-s", serial]
        self.remote_xml = f"/sdcard/turismo-responsive-{os.getpid()}.xml"

    def run(self, *args: str, binary: bool = False, timeout: int = 30):
        result = subprocess.run(
            [*self.prefix, *args], capture_output=True, timeout=timeout, check=False
        )
        if result.returncode:
            raise RuntimeError(result.stderr.decode(errors="replace").strip())
        return result.stdout if binary else result.stdout.decode(errors="replace").strip()

    def shell(self, *args: str):
        # adb invokes a remote shell; quote there as well as avoiding a local shell.
        return self.run("shell", shlex.join(args))

    def dump(self):
        self.shell("uiautomator", "dump", "--compressed", self.remote_xml)
        raw = self.run("exec-out", "cat", self.remote_xml, binary=True)
        start = raw.find(b"<?xml")
        if start < 0:
            start = raw.find(b"<hierarchy")
        if start < 0:
            raise RuntimeError("UIAutomator did not return an XML hierarchy")
        raw = raw[start:]
        return raw, ET.fromstring(raw)

    def screenshot(self, destination: Path):
        raw = self.run("exec-out", "screencap", "-p", binary=True)
        if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("screencap did not return a PNG")
        destination.write_bytes(raw)


def bounds(node):
    match = BOUNDS_RE.fullmatch(node.get("bounds", ""))
    return tuple(map(int, match.groups())) if match else (0, 0, 0, 0)


def label(node):
    return node.get("content-desc") or node.get("text", "")


def find(root, expected: str, prefix: bool = False):
    for node in root.iter("node"):
        value = label(node)
        if value.startswith(expected) if prefix else value == expected:
            return node
    return None


def metrics(root, screen):
    for node in root.iter("node"):
        match = METRICS_RE.search(label(node))
        if match and match[1] == screen:
            return {
                "screen": match[1],
                "width": float(match[2]),
                "height": float(match[3]),
                "fontScale": float(match[4]),
            }
    return None


def check(result, name: str, passed: bool, **details):
    result["checks"].append({"name": name, "passed": bool(passed), **details})


def valid_bounds(rect, profile, min_height=1):
    x1, y1, x2, y2 = rect
    return 0 <= x1 < x2 <= profile["width"] and 0 <= y1 < y2 <= profile["height"] and y2 - y1 >= min_height


def check_control(result, root, name, profile, prefix=False, min_height=1):
    node = find(root, name, prefix)
    rect = bounds(node) if node is not None else (0, 0, 0, 0)
    check(result, name, valid_bounds(rect, profile, min_height), bounds=rect, found=node is not None)
    return node


def check_disjoint(result, root, names):
    nodes = [find(root, name) for name in names]
    overlaps = []
    for index, node in enumerate(nodes):
        if node is None:
            continue
        x1, y1, x2, y2 = bounds(node)
        for other_index in range(index + 1, len(nodes)):
            other = nodes[other_index]
            if other is None:
                continue
            ox1, oy1, ox2, oy2 = bounds(other)
            if min(x2, ox2) > max(x1, ox1) and min(y2, oy2) > max(y1, oy1):
                overlaps.append([names[index], names[other_index]])
    check(result, "Controls do not overlap: " + ", ".join(names), not overlaps, overlaps=overlaps)


def tap(adb, node):
    if node is None:
        raise RuntimeError("The control to tap was not found")
    x1, y1, x2, y2 = bounds(node)
    adb.shell("input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))


def capture(adb, folder, stage):
    raw, root = adb.dump()
    (folder / f"{stage}.xml").write_bytes(raw)
    adb.screenshot(folder / f"{stage}.png")
    return root


def reach(adb, root, name, profile, limit=5, reverse=False, prefix=False, min_height=1):
    """Reach a control in either direction of a native scroll viewport."""
    for attempt in range(limit + 1):
        node = find(root, name, prefix)
        if node is not None:
            if valid_bounds(bounds(node), profile, min_height):
                return root
        if attempt == limit:
            break
        scrolls = [node for node in root.iter("node") if node.get("scrollable") == "true" and valid_bounds(bounds(node), profile)]
        if not scrolls:
            break
        # The largest native scroll area is the scene body, not a small field.
        rect = max((bounds(node) for node in scrolls), key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
        x1, y1, x2, y2 = rect
        x = (x1 + x2) // 2
        start, end = y1 + (y2 - y1) * 3 // 4, y1 + (y2 - y1) // 4
        if reverse:
            start, end = end, start
        adb.shell("input", "swipe", str(x), str(start), str(x), str(end), "300")
        _, root = adb.dump()
    return root


def keyboard_top_from_windows(windows):
    # InsetsSource can insert visibleFrame and other fields between frame and
    # visible. A hidden keyboard retains its last frame, so visibility matters.
    for line in windows.splitlines():
        if not re.search(r"\btype=ime\b", line) or not re.search(r"\bvisible=true\b", line):
            continue
        for field in ("frame", "visibleFrame"):
            match = re.search(rf"\b{field}=(\[\d+,\d+\]\[\d+,\d+\])", line)
            if match:
                x1, y1, x2, y2 = map(int, BOUNDS_RE.fullmatch(match[1]).groups())
                if x2 > x1 and y2 > y1:
                    return y1
    return None


def keyboard_top(adb, root, evidence_path=None):
    rectangles = [bounds(node) for node in root.iter("node") if "inputmethod" in node.get("package", "")]
    visible = [rect for rect in rectangles if rect[2] > rect[0] and rect[3] > rect[1]]
    if visible:
        return min(rect[1] for rect in visible)
    windows = adb.shell("dumpsys", "window")
    if evidence_path is not None:
        evidence_path.write_text(windows)
    return keyboard_top_from_windows(windows)


def ime_fullscreen_from_dump(dump):
    # Match current-state fields, excluding historical inFullscreenMode lines.
    states = re.findall(r"\b(?:mInFullscreenMode|mFullscreenMode|mIsFullscreen)=(true|false)\b", dump)
    return any(state == "true" for state in states) if states else None


def inspect_screen(adb, screen, profile, output):
    folder = output / profile["name"] / screen
    folder.mkdir(parents=True, exist_ok=True)
    result = {"profile": profile["name"], "screen": screen, "checks": [], "artifacts": str(folder)}
    try:
        adb.shell("input", "keyevent", "111")  # Hide any keyboard from the previous scene.
        adb.shell("am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", f"turismo-vinculacion://qa?screen={screen}", PACKAGE)
        deadline = time.monotonic() + 35
        observed = None
        while time.monotonic() < deadline:
            _, root = adb.dump()
            observed = metrics(root, screen)
            if observed:
                break
            time.sleep(0.3)
        if not observed:
            raise RuntimeError("QA telemetry absent. Start the isolated QA Metro harness before running this script.")
        result["metrics"] = observed
        check(result, "Native viewport", 0 <= profile["width"] - observed["width"] <= 80 and 0 <= profile["height"] - observed["height"] <= 100, expected=profile, observed=observed)
        check(result, "Native fontScale", abs(profile["fontScale"] - observed["fontScale"]) <= 0.03, expected=profile["fontScale"], observed=observed["fontScale"])
        root = capture(adb, folder, "initial")

        if screen == "tabs":
            for name in ("Información", "Opiniones", "Fotos", "Explorar", "Guardados", "Menú"):
                check_control(result, root, name, profile)
            check_disjoint(result, root, ["Información", "Opiniones", "Fotos"])
            check_disjoint(result, root, ["Explorar", "Guardados", "Menú"])
            tap(adb, find(root, "Opiniones"))
            root = capture(adb, folder, "tab-selected")
            selected = find(root, "Opiniones")
            check(result, "Opiniones becomes selected", (selected is not None and selected.get("selected") == "true") or find(root, "QA_TAB:Opiniones") is not None)

        elif screen == "chat":
            root = reach(adb, root, "Ver ficha de Restaurante de prueba", profile, reverse=True, prefix=True)
            root = capture(adb, folder, "card-visible")
            check_control(result, root, "Ver ficha de Restaurante de prueba", profile, prefix=True)
            field = check_control(result, root, "Escribe una consulta al agente", profile)
            check_control(result, root, "Enviar mensaje", profile)
            tap(adb, field)
            adb.shell("input", "text", "Consulta%slarga%sde%sprueba")
            root = capture(adb, folder, "keyboard")
            top = keyboard_top(adb, root, folder / "keyboard-window.txt")
            ime_dump = adb.shell("dumpsys", "input_method")
            (folder / "keyboard-input-method.txt").write_text(ime_dump)
            fullscreen = ime_fullscreen_from_dump(ime_dump)
            check(result, "Native keyboard appears", top is not None, keyboardTop=top)
            check(result, "Native IME leaves app visible", fullscreen is False, fullscreen=fullscreen)
            for name in ("Escribe una consulta al agente", "Enviar mensaje"):
                node = check_control(result, root, name, profile)
                check(result, f"{name} above keyboard", node is not None and top is not None and fullscreen is False and bounds(node)[3] <= top + 2, bounds=bounds(node) if node is not None else None, keyboardTop=top, fullscreen=fullscreen)
            check_disjoint(result, root, ["Escribe una consulta al agente", "Enviar mensaje"])
            adb.shell("input", "keyevent", "111")

        elif screen == "route":
            root = reach(adb, root, "Iniciar navegación", profile)
            root = capture(adb, folder, "primary-action")
            check_control(result, root, "Iniciar navegación", profile)
            handle = find(root, "Expandir detalles de la ruta")
            if handle is not None:
                tap(adb, handle)
            else:
                tap(adb, find(root, "QA Alternar panel de ruta"))
            root = capture(adb, folder, "expanded")
            check_control(result, root, "Contraer detalles de la ruta", profile)
            for mode, stage in (("Bicicleta", "bicycle"), ("A pie", "foot")):
                # A cropped 30dp strip can show just the icon. Require at least
                # the project's 44dp target after scrolling each mode into view.
                root = reach(adb, root, mode, profile, min_height=44)
                root = capture(adb, folder, f"modes-visible-{stage}")
                check_control(result, root, mode, profile, min_height=44)
            root = reach(adb, root, "Iniciar navegación", profile)
            root = capture(adb, folder, "expanded-primary-action")
            check_control(result, root, "Iniciar navegación", profile)

        elif screen == "search":
            check(result, "Tab navigation visible before search", all(find(root, name) is not None for name in ("Explorar", "Guardados", "Menú")))
            tap(adb, find(root, "QA Abrir búsqueda"))
            _, root = adb.dump()
            field_name = "Buscar atractivos, servicios y lugares"
            field = check_control(result, root, field_name, profile)
            tap(adb, field)
            adb.shell("input", "text", "cafe")
            root = capture(adb, folder, "typing")
            check(result, "Search hides tab navigation", all(find(root, name) is None for name in ("Explorar", "Guardados", "Menú")))
            top = keyboard_top(adb, root, folder / "keyboard-window.txt")
            ime_dump = adb.shell("dumpsys", "input_method")
            (folder / "keyboard-input-method.txt").write_text(ime_dump)
            fullscreen = ime_fullscreen_from_dump(ime_dump)
            check(result, "Search keyboard appears", top is not None, keyboardTop=top)
            check(result, "Search IME leaves list visible", fullscreen is False, fullscreen=fullscreen)
            check(result, "Search field above keyboard", field is not None and top is not None and bounds(field)[3] <= top + 2)
            result_name = "Cafetería de prueba con un nombre extenso"
            live_row = find(root, result_name, prefix=True)
            live_bounds = bounds(live_row) if live_row is not None else (0, 0, 0, 0)
            check(result, "Live option reachable above keyboard while typing", top is not None and live_row is not None and min(live_bounds[3], top) - live_bounds[1] >= 44, bounds=live_bounds, keyboardTop=top)
            root = reach(adb, root, result_name, profile, prefix=True, min_height=44)
            root = capture(adb, folder, "live-result")
            check_control(result, root, result_name, profile, prefix=True, min_height=44)
            # Reach may dismiss the keyboard by scrolling. Refocus and submit.
            tap(adb, find(root, field_name))
            adb.shell("input", "keyevent", "66")
            root = capture(adb, folder, "after-submit")
            check_control(result, root, field_name, profile)
            check(result, "Submit retains the live list", find(root, "Volver al mapa") is not None)
            check(result, "Tab navigation stays hidden without keyboard", all(find(root, name) is None for name in ("Explorar", "Guardados", "Menú")))
            root = reach(adb, root, result_name, profile, prefix=True, min_height=44)
            root = capture(adb, folder, "selectable-result")
            row = check_control(result, root, result_name, profile, prefix=True, min_height=44)
            tap(adb, row)
            root = capture(adb, folder, "selected")
            check(result, "One tap selects a result", find(root, "QA_SEARCH:selected:service") is not None)
            check(result, "Selection restores tab navigation", all(find(root, name) is not None for name in ("Explorar", "Guardados", "Menú")))

        elif screen == "form":
            for name in ("QA Nombre", "QA Correo"):
                root = reach(adb, root, name, profile)
                root = capture(adb, folder, "field-" + ("name" if name == "QA Nombre" else "email"))
                check_control(result, root, name, profile)
            root = reach(adb, root, "QA Comentario", profile)
            field = check_control(result, root, "QA Comentario", profile)
            tap(adb, field)
            adb.shell("input", "text", "Texto%sde%sprueba")
            capture(adb, folder, "keyboard")
            adb.shell("input", "keyevent", "111")
            _, root = adb.dump()
            root = reach(adb, root, "QA Enviar formulario", profile, min_height=44)
            root = capture(adb, folder, "submit-reachable")
            check_control(result, root, "QA Enviar formulario", profile, min_height=44)
            tap(adb, find(root, "QA Enviar formulario"))
            _, root = adb.dump()
            confirmation_height = 24 * profile["fontScale"]
            root = reach(adb, root, "QA_FORM:submitted", profile, min_height=confirmation_height)
            root = capture(adb, folder, "submitted")
            marker = find(root, "QA_FORM:submitted")
            check(result, "Form submit responds", marker is not None and valid_bounds(bounds(marker), profile, confirmation_height), bounds=bounds(marker) if marker is not None else None)
    except (RuntimeError, subprocess.SubprocessError, ET.ParseError) as error:
        check(result, "Scene executes", False, error=str(error))
        try:
            capture(adb, folder, "failure")
        except (RuntimeError, subprocess.SubprocessError, ET.ParseError):
            pass
    result["passed"] = all(item["passed"] for item in result["checks"])
    return result


def snapshot(adb):
    window_config = adb.shell("dumpsys", "window")
    font = re.search(r"mGlobalConfiguration=\{([\d.]+)\b", window_config)
    return {
        "size": adb.shell("wm", "size"),
        "density": adb.shell("wm", "density"),
        "settings": {key: adb.shell("settings", "get", "system", key) for key in ("font_scale", "accelerometer_rotation", "user_rotation")},
        "effectiveFontScale": font[1] if font else None,
    }


def numeric_equal(expected, actual):
    try:
        return Decimal(str(expected)) == Decimal(str(actual))
    except InvalidOperation:
        return expected == actual


def restoration_differences(original, restored):
    differences = []
    for field in ("size", "density", "effectiveFontScale"):
        if field not in original:
            continue
        expected, actual = original.get(field), restored.get(field)
        if expected != actual:
            equivalent = numeric_equal(expected, actual) if field == "effectiveFontScale" else expected.split() == actual.split()
            differences.append({"field": field, "expected": expected, "actual": actual, "equivalent": equivalent})
    for key, expected in original["settings"].items():
        actual = restored["settings"][key]
        if expected == actual:
            continue
        # Android may materialize the missing default font setting as 1.0.
        # Keep the raw difference, and independently check effectiveFontScale.
        default_normalized = key == "font_scale" and (expected == "null" or actual == "null")
        equivalent = numeric_equal("1" if default_normalized and expected == "null" else expected, "1" if default_normalized and actual == "null" else actual)
        differences.append({"field": f"settings.{key}", "expected": expected, "actual": actual, "equivalent": equivalent})
    return differences


def restore(adb, original, report=None):
    errors = []
    commands = []
    for kind in ("size", "density"):
        match = re.search(rf"Override {kind}: ([\d+x]+)", original[kind])
        commands.append(("wm", kind, match[1] if match else "reset"))
    for key, value in original["settings"].items():
        commands.append(("settings", "delete", "system", key) if value == "null" else ("settings", "put", "system", key, value))
    commands.append(("rm", "-f", adb.remote_xml))
    for command in commands:
        try:
            adb.shell(*command)
        except (RuntimeError, subprocess.SubprocessError) as error:
            errors.append(f"{' '.join(command[:3])}: {error}")
    try:
        restored = snapshot(adb)
        differences = restoration_differences(original, restored)
        # Android configuration observers can finish after settings writes.
        deadline = time.monotonic() + 2
        while any(not difference["equivalent"] for difference in differences) and time.monotonic() < deadline:
            time.sleep(0.1)
            restored = snapshot(adb)
            differences = restoration_differences(original, restored)
        if report is not None:
            report["restoredSettings"] = restored
            report["restoreDifferences"] = differences
        for difference in differences:
            if not difference["equivalent"]:
                errors.append(f"{difference['field']}: expected {difference['expected']!r}, restored {difference['actual']!r}")
    except (RuntimeError, subprocess.SubprocessError) as error:
        errors.append(f"Restoration could not be verified: {error}")
    return errors


def parse_matrix(value):
    profiles = []
    for entry in value.split(","):
        match = re.fullmatch(r"(\d+)x(\d+):(\d+(?:\.\d+)?)", entry.strip())
        if not match:
            raise argparse.ArgumentTypeError("Use widthxheight:fontScale, e.g. 320x568:1,640x360:2")
        width, height, scale = int(match[1]), int(match[2]), float(match[3])
        if min(width, height) < 240 or max(width, height) > 2048 or not 0.8 <= scale <= 3:
            raise argparse.ArgumentTypeError("Use 240–2048 dp and fontScale 0.8–3")
        profiles.append({"name": f"{width}x{height}-font{scale:g}", "width": width, "height": height, "fontScale": scale})
    return profiles


def write_report(report, output):
    (output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    lines = ["# Verificación nativa de responsividad Android", "", f"Emulador: `{report['serial']}`. Perfiles: {len(report['matrix'])}.", "", "| Perfil | Pantalla | Geometría y controles | Evidencia |", "| --- | --- | --- | --- |"]
    for item in report["results"]:
        relative = Path(item["artifacts"]).relative_to(output)
        lines.append(f"| {item['profile']} | {item['screen']} | {'PASS' if item['passed'] else 'FAIL'} | [{relative}]({relative}/initial.png) |")
    failures = [(item, check) for item in report["results"] for check in item["checks"] if not check["passed"]]
    if failures:
        lines.extend(["", "## Fallos", ""])
        for item, failure in failures:
            lines.append(f"- {item['profile']} / {item['screen']}: {failure['name']}. {failure.get('error', '')}")
    lines.extend(["", "## Alcance", "", "Comprueba dimensiones y fuente recibidas por React Native, controles en los límites de pantalla, selección de pestañas, alcance mediante scroll y compositor sobre el teclado nativo. Usa componentes reales con datos ficticios y sin la API ni almacenamiento del usuario.", "", "Las capturas requieren revisión visual: UIAutomator no detecta todos los textos recortados, defectos gráficos ni cambios entre dispositivos. Estos perfiles simulan tamaños y fuente en un emulador Android; no certifican iOS ni todos los modelos físicos.", "", f"Restauración del emulador: {'PASS' if not report['restoreErrors'] else 'FAIL'}."])
    lines.extend(f"- {error}" for error in report["restoreErrors"])
    for difference in report.get("restoreDifferences", []):
        if difference["equivalent"]:
            lines.append(f"- Normalización equivalente: `{difference['field']}` {difference['expected']!r} → {difference['actual']!r}.")
    if report.get("error"):
        lines.extend(["", f"Ejecución interrumpida: {report['error']}"])
    (output / "report.md").write_text("\n".join(lines) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", required=True, help="Mandatory emulator-NNNN serial; physical devices are refused")
    parser.add_argument("--output", type=Path, default=Path(f"/tmp/turismo-responsive-{datetime.now().strftime('%Y%m%d-%H%M%S')}"))
    parser.add_argument("--screens", default=",".join(SCREENS))
    parser.add_argument("--matrix", type=parse_matrix, default=DEFAULT_MATRIX)
    parser.add_argument("--quick", action="store_true", help="Run 320x568:1,640x360:1,320x568:2")
    args = parser.parse_args()
    if not re.fullmatch(r"emulator-\d+", args.serial):
        parser.error("Only explicitly selected emulator-NNNN devices are allowed")
    screens = args.screens.split(",")
    if not screens or any(screen not in SCREENS for screen in screens):
        parser.error(f"--screens must contain {','.join(SCREENS)}")
    if not shutil.which("adb"):
        parser.error("adb is required in PATH")
    adb = Adb(args.serial)
    if adb.run("get-state") != "device" or adb.shell("getprop", "ro.kernel.qemu") != "1":
        parser.error("The selected serial must be a running Android emulator")
    if "package:" not in adb.shell("pm", "path", PACKAGE):
        parser.error("Install the development APK and start QA Metro before running")
    matrix = parse_matrix("320x568:1,640x360:1,320x568:2") if args.quick else args.matrix
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    original = snapshot(adb)
    report = {"createdAt": datetime.now(timezone.utc).isoformat(), "serial": args.serial, "matrix": matrix, "screens": screens, "originalSettings": original, "results": [], "restoreErrors": [], "visualReviewRequired": True}
    # Turn SIGTERM into a normal exception so finally restores display settings.
    def interrupted(*_):
        raise KeyboardInterrupt()

    signal.signal(signal.SIGTERM, interrupted)
    try:
        adb.shell("settings", "put", "system", "accelerometer_rotation", "0")
        adb.shell("settings", "put", "system", "user_rotation", "0")
        for profile in matrix:
            print(f"{profile['name']}: running {','.join(screens)}", flush=True)
            adb.shell("wm", "density", "160")
            adb.shell("wm", "size", f"{profile['width']}x{profile['height']}")
            adb.shell("settings", "put", "system", "font_scale", str(profile["fontScale"]))
            adb.shell("am", "force-stop", PACKAGE)
            for screen in screens:
                result = inspect_screen(adb, screen, profile, output)
                report["results"].append(result)
                print(f"  {screen}: {'PASS' if result['passed'] else 'FAIL'}", flush=True)
    except (KeyboardInterrupt, RuntimeError, subprocess.SubprocessError) as error:
        report["error"] = str(error) or "Interrupted"
    finally:
        report["restoreErrors"] = restore(adb, original, report)
        write_report(report, output)
    print(f"Report: {output / 'report.md'}", flush=True)
    return int(bool(report.get("error") or report["restoreErrors"] or any(not item["passed"] for item in report["results"])))


if __name__ == "__main__":
    sys.exit(main())

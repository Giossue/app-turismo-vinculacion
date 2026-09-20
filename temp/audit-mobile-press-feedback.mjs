#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const sourceRoot = resolve(repositoryRoot, "apps/mobile/src");
const sourceExtensions = new Set([".ts", ".tsx"]);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
      continue;
    }

    const extension = entry.name.slice(entry.name.lastIndexOf("."));
    if (sourceExtensions.has(extension)) files.push(entryPath);
  }

  return files;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function relativeSourcePath(filePath) {
  return relative(repositoryRoot, filePath).replaceAll("\\", "/");
}

const files = await collectSourceFiles(sourceRoot);
const inventory = {
  pressables: [],
  paperButtons: [],
  paperChips: [],
  paperIconButtons: [],
  nativeRipples: [],
  tourismIconActions: [],
};
const findings = [];

for (const filePath of files.sort()) {
  const source = await readFile(filePath, "utf8");
  const path = relativeSourcePath(filePath);

  const collectMatches = (pattern, target) => {
    for (const match of source.matchAll(pattern)) {
      target.push(`${path}:${lineAt(source, match.index ?? 0)}`);
    }
  };

  collectMatches(/<Pressable\b/g, inventory.pressables);
  collectMatches(/<PaperButton\b/g, inventory.paperButtons);
  collectMatches(/<PaperChip\b/g, inventory.paperChips);
  collectMatches(/<PaperIconButton\b/g, inventory.paperIconButtons);
  collectMatches(/android_ripple\s*=/g, inventory.nativeRipples);
  collectMatches(/<TourismIconAction\b/g, inventory.tourismIconActions);

  if (/<PaperIconButton\b/.test(source) && !/contentStyle\s*=/.test(source)) {
    findings.push({
      path,
      line: lineAt(source, source.indexOf("<PaperIconButton")),
      reason:
        "PaperIconButton sin contentStyle: el ripple interno puede ignorar la forma del contenedor.",
    });
  }

  if (/android_ripple\s*=/.test(source)) {
    findings.push({
      path,
      line: lineAt(source, source.indexOf("android_ripple")),
      reason:
        "Ripple nativo declarado directamente: revisar borderRadius/overflow del Pressable.",
    });
  }
}

console.log("Auditoría de feedback táctil móvil");
console.log(`Archivos fuente revisados: ${files.length}`);
console.log(`Pressable: ${inventory.pressables.length}`);
console.log(`TourismIconAction: ${inventory.tourismIconActions.length}`);
console.log(`PaperButton: ${inventory.paperButtons.length}`);
console.log(`PaperChip: ${inventory.paperChips.length}`);
console.log(`PaperIconButton: ${inventory.paperIconButtons.length}`);
console.log(`android_ripple directo: ${inventory.nativeRipples.length}`);

if (findings.length > 0) {
  console.log("\nCasos que requieren revisión:");
  for (const finding of findings) {
    console.log(`- ${finding.path}:${finding.line} — ${finding.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nSin casos de ripple rectangular detectados por las reglas de auditoría.");
}

import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = dirname(dirname(require.resolve("@fission-ai/openspec")));
const cli = join(packageRoot, "bin", "openspec.js");
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tooling = JSON.parse(
  readFileSync(join(projectRoot, "openspec", "tooling.json"), "utf8"),
);
const installed = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
);
if (installed.version !== tooling.cliVersion) {
  throw new Error(
    `OpenSpec ${tooling.cliVersion} requerido; instalado ${installed.version}.`,
  );
}
const profileDirectory = mkdtempSync(join(tmpdir(), "turismo-openspec-"));

try {
  const configDirectory = join(profileDirectory, "openspec");
  mkdirSync(configDirectory);
  writeFileSync(
    join(configDirectory, "config.json"),
    JSON.stringify({
      profile: tooling.profile,
      delivery: tooling.delivery,
      workflows: tooling.workflows,
      telemetry: { enabled: false },
    }),
    { mode: 0o600 },
  );
  const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: profileDirectory,
      OPENSPEC_TELEMETRY: "0",
      OPENSPEC_NO_UPDATE_CHECK: "1",
      OPENSPEC_NO_ANIMATION: "1",
    },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(profileDirectory, { recursive: true, force: true });
}

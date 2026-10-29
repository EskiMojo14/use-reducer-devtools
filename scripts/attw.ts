import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "use-reducer-devtools-attw-"));
const tarball = join(tempDir, "package.tgz");

try {
  const pack = spawnSync("pnpm", ["pack", "--out", tarball, "--silent"], {
    stdio: "inherit",
  });
  if (pack.status !== 0) {
    process.exitCode = pack.status ?? 1;
  } else {
    const check = spawnSync("pnpm", ["exec", "attw", tarball], {
      stdio: "inherit",
    });
    process.exitCode = check.status ?? 1;
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

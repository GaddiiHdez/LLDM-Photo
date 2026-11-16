import { rolldown } from 'rolldown';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const tempDir = mkdtempSync(join(tmpdir(), 'bereasnap-tests-'));
const outFile = join(tempDir, 'core.test.mjs');

try {
  const bundle = await rolldown({
    input: resolve('tests/core.test.ts'),
    external: [/^node:/],
  });
  await bundle.write({
    file: outFile,
    format: 'esm',
  });
  await bundle.close();

  const res = spawnSync(process.execPath, ['--test', outFile], {
    stdio: 'inherit',
  });
  process.exitCode = res.status ?? 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

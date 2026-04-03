import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getTestRunnerDetectors } from '../registry/index.js';

export function detectTestRunner(root: string): string | null {
  const detectors = getTestRunnerDetectors();

  for (const detector of detectors) {
    if (detector.detect(root)) return detector.name;
  }

  // Check workspace packages
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      for (const child of children) {
        for (const detector of detectors) {
          if (detector.detect(join(dirPath, child))) return detector.name;
        }
      }
    } catch {}
  }

  return null;
}

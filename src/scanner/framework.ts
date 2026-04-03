import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getFrameworkDetectors } from '../registry/index.js';

export function detectFramework(root: string): string | null {
  const detectors = getFrameworkDetectors();

  // Check root first
  for (const detector of detectors) {
    if (detector.detect(root)) return detector.name;
  }

  // Check workspace packages (monorepo — backend packages first)
  const backendNames = ['core', 'server', 'api', 'backend', 'app'];
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      children.sort((a, b) => {
        const aIsBackend = backendNames.some((n) => a.toLowerCase().includes(n)) ? 0 : 1;
        const bIsBackend = backendNames.some((n) => b.toLowerCase().includes(n)) ? 0 : 1;
        return aIsBackend - bIsBackend;
      });
      for (const child of children) {
        const pkgPath = join(dirPath, child);
        for (const detector of detectors) {
          if (detector.detect(pkgPath)) return detector.name;
        }
      }
    } catch {}
  }

  return null;
}

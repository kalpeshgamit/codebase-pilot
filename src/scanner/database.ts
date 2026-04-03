import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseInfo } from '../types.js';
import { getOrmDetectors } from '../registry/index.js';

export function detectDatabase(root: string): DatabaseInfo | null {
  const detectors = getOrmDetectors();

  // Check root first
  for (const detector of detectors) {
    const result = detector.detect(root);
    if (result) {
      const schemaPath = findSchemaPath(root, detector.schemaPaths);
      return { orm: detector.name, type: result === 'auto' ? 'auto' : result, schemaPath };
    }
  }

  // Check workspace packages (monorepo)
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      for (const child of children) {
        const pkgPath = join(dirPath, child);
        for (const detector of detectors) {
          const result = detector.detect(pkgPath);
          if (result) {
            const schemaPath = findSchemaPath(pkgPath, detector.schemaPaths);
            const relativePath = schemaPath ? `${dir}/${child}/${schemaPath}` : null;
            return { orm: detector.name, type: result === 'auto' ? 'auto' : result, schemaPath: relativePath };
          }
        }
      }
    } catch {}
  }

  return null;
}

function findSchemaPath(root: string, candidates: string[]): string | null {
  for (const path of candidates) {
    if (existsSync(join(root, path))) return path;
  }
  return null;
}

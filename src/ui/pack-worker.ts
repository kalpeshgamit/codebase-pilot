// src/ui/pack-worker.ts — runs packProject in a worker thread so the HTTP server never blocks
import { workerData, parentPort } from 'node:worker_threads';
import { resolve, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { packProject } from '../packer/index.js';
import { collectFiles } from '../packer/collector.js';
import { logPackRun } from '../packer/usage-logger.js';
import { scanForSecrets } from '../security/scanner.js';

function send(msg: object) { parentPort?.postMessage(msg); }

async function run() {
  const { root, trigger } = workerData as { root: string; trigger: string };

  try {
    send({ type: 'progress', step: 'collecting', label: 'Collecting files…', pct: 10 });

    const configDir = resolve(root, '.codebase-pilot');
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

    send({ type: 'progress', step: 'packing', label: 'Packing codebase…', pct: 35 });
    const result = packProject({ dir: root, format: 'xml', compress: true, noSecurity: false });

    send({ type: 'progress', step: 'compressing', label: 'Compressing tokens…', pct: 60 });
    const outputPath = resolve(root, '.codebase-pilot', 'context.xml');
    writeFileSync(outputPath, result.output, 'utf8');

    logPackRun(root, {
      date: new Date().toISOString(),
      project: basename(root),
      projectPath: root,
      tokensRaw: result.rawTokens,
      tokensPacked: result.totalTokens,
      files: result.fileCount,
      compressed: true,
      command: `auto-pack (${trigger})`,
    });

    send({ type: 'progress', step: 'scanning', label: 'Scanning secrets…', pct: 80 });
    const files = collectFiles(root, {});
    let secretCount = 0;
    const secretAlerts: Array<{ file: string; count: number }> = [];
    for (const f of files.slice(0, 200)) {
      try {
        const content = readFileSync(resolve(root, f.relativePath), 'utf8');
        const secrets = scanForSecrets(content, f.relativePath);
        if (secrets.length > 0) {
          secretCount += secrets.length;
          secretAlerts.push({ file: f.relativePath, count: secrets.length });
        }
      } catch { /* skip */ }
    }

    const saved = result.rawTokens - result.totalTokens;
    const savePct = result.rawTokens > 0 ? Math.round((saved / result.rawTokens) * 100) : 0;

    send({
      type: 'done',
      trigger,
      files: result.fileCount,
      tokens: result.totalTokens,
      rawTokens: result.rawTokens,
      saved,
      savePct,
      secretCount,
      secretAlerts: secretAlerts.slice(0, 5),
      time: new Date().toISOString(),
    });
  } catch (err) {
    send({ type: 'error', trigger, error: String(err) });
  }
}

run();

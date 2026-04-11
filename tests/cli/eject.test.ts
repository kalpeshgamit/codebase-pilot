import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ejectCommand } from '../../src/cli/eject.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `cp-eject-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('ejectCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('moves agents.json to root', async () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), '{"agents":{}}');
    await ejectCommand({ dir: tmpDir });
    expect(existsSync(join(tmpDir, 'agents.json'))).toBe(true);
  });

  it('removes .codebase-pilot directory', async () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), '{"agents":{}}');
    await ejectCommand({ dir: tmpDir });
    expect(existsSync(join(tmpDir, '.codebase-pilot'))).toBe(false);
  });

  it('cleans codebase-pilot entries from .gitignore', async () => {
    writeFileSync(join(tmpDir, '.gitignore'), 'node_modules/\n# codebase-pilot (local only)\n.codebase-pilot/\ndist/\n');
    await ejectCommand({ dir: tmpDir });
    const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
    expect(content).not.toContain('.codebase-pilot/');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
  });

  it('removes codebase-pilot MCP server from mcp.json', async () => {
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(join(tmpDir, '.claude', 'mcp.json'), JSON.stringify({
      mcpServers: {
        'codebase-pilot': { command: 'codebase-pilot', args: ['serve'] },
        'other-server': { command: 'other', args: [] },
      }
    }, null, 2));
    await ejectCommand({ dir: tmpDir });
    const content = JSON.parse(readFileSync(join(tmpDir, '.claude', 'mcp.json'), 'utf8'));
    expect(content.mcpServers['codebase-pilot']).toBeUndefined();
    expect(content.mcpServers['other-server']).toBeDefined();
  });

  it('removes codebase-pilot hook from settings.json but keeps other hooks', async () => {
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: 'command', command: 'codebase-pilot-log-prompt', timeout: 5 }] },
          { hooks: [{ type: 'command', command: 'other-hook' }] },
        ]
      }
    }, null, 2));
    await ejectCommand({ dir: tmpDir });
    const content = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    const hooks = content.hooks.UserPromptSubmit as Array<{ hooks: Array<{ command: string }> }>;
    const hasPilotHook = hooks.some(e => e.hooks?.some(h => h.command?.includes('codebase-pilot-log-prompt')));
    expect(hasPilotHook).toBe(false);
    expect(hooks.length).toBe(1); // other-hook preserved
  });

  it('runs cleanly when no codebase-pilot files exist', async () => {
    // Should not throw
    await expect(ejectCommand({ dir: tmpDir })).resolves.not.toThrow();
  });
});

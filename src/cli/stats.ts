import { resolve, basename } from 'node:path';
import {
  readPackLogs,
  readGlobalLogs,
  getStats,
  getProjectSummaries,
  getRecentRuns,
} from '../packer/usage-logger.js';
import { formatTokenCount } from '../packer/token-counter.js';

interface StatsOptions {
  dir: string;
  global: boolean;
  limit: string;
}

export async function statsCommand(options: StatsOptions): Promise<void> {
  const limit = parseInt(options.limit, 10) || 10;

  console.log('');

  if (options.global) {
    showGlobalStats(limit);
  } else {
    const root = resolve(options.dir);
    showProjectStats(root, limit);
  }
}

function showGlobalStats(limit: number): void {
  const logs = readGlobalLogs();

  if (logs.length === 0) {
    console.log('  No usage history found.');
    console.log('  Run `codebase-pilot pack` in any project to start tracking.');
    console.log('');
    return;
  }

  // Overall stats
  const today = getStats(logs, 1);
  const week = getStats(logs, 7);
  const month = getStats(logs, 30);
  const allTime = getStats(logs, 99999);

  console.log('  codebase-pilot — System-wide Stats');
  console.log('  ===================================');
  console.log('');
  console.log('  Savings overview:');
  console.log(`    Today:       ${today.sessions} sessions   ${formatTokenCount(today.tokensSaved)} tokens saved   ${formatTokenCount(today.tokensUsed)} tokens used`);
  console.log(`    This week:   ${week.sessions} sessions   ${formatTokenCount(week.tokensSaved)} tokens saved   ${formatTokenCount(week.tokensUsed)} tokens used`);
  console.log(`    This month:  ${month.sessions} sessions   ${formatTokenCount(month.tokensSaved)} tokens saved   ${formatTokenCount(month.tokensUsed)} tokens used`);
  console.log(`    All time:    ${allTime.sessions} sessions   ${formatTokenCount(allTime.tokensSaved)} tokens saved   ${formatTokenCount(allTime.tokensUsed)} tokens used`);
  console.log('');

  // Per-project breakdown
  const summaries = getProjectSummaries(logs);
  if (summaries.length > 0) {
    console.log('  Projects:');
    console.log('');
    const maxName = Math.min(25, Math.max(...summaries.map(s => s.project.length)));
    console.log(`    ${'Project'.padEnd(maxName)}  Sessions  Saved        Used         Last used`);
    console.log(`    ${'-'.repeat(maxName)}  --------  -----------  -----------  ----------`);

    for (const s of summaries) {
      const lastDate = new Date(s.lastUsed).toLocaleDateString();
      console.log(
        `    ${s.project.padEnd(maxName)}  ${String(s.sessions).padStart(8)}  ${formatTokenCount(s.tokensSaved).padStart(11)}  ${formatTokenCount(s.tokensUsed).padStart(11)}  ${lastDate}`,
      );
    }
    console.log('');
  }

  // Recent runs
  const recent = getRecentRuns(logs, limit);
  if (recent.length > 0) {
    console.log(`  Recent sessions (last ${limit}):`)
    console.log('');

    for (const run of recent) {
      const date = new Date(run.date);
      const time = date.toLocaleString();
      const saved = run.tokensRaw - run.tokensPacked;
      const pct = run.tokensRaw > 0 ? Math.round((saved / run.tokensRaw) * 100) : 0;
      const compress = run.compressed ? ' --compress' : '';
      const agent = run.agent ? ` --agent ${run.agent}` : '';

      console.log(`    [${time}] ${run.project}`);
      console.log(`      ${run.command}${compress}${agent} → ${run.files} files`);
      console.log(`      Raw: ${formatTokenCount(run.tokensRaw)}  Packed: ${formatTokenCount(run.tokensPacked)}  Saved: ${formatTokenCount(saved)} (${pct}%)`);
      console.log('');
    }
  }
}

function showProjectStats(root: string, limit: number): void {
  const logs = readPackLogs(root);
  const projectName = basename(root);

  if (logs.length === 0) {
    console.log(`  No usage history for ${projectName}.`);
    console.log('  Run `codebase-pilot pack` to start tracking.');
    console.log('');
    return;
  }

  const today = getStats(logs, 1);
  const week = getStats(logs, 7);
  const month = getStats(logs, 30);
  const allTime = getStats(logs, 99999);

  console.log(`  codebase-pilot — ${projectName} Stats`);
  console.log(`  ${'='.repeat(projectName.length + 24)}`);
  console.log('');
  console.log('  Savings:');
  console.log(`    Today:       ${today.sessions} sessions   ${formatTokenCount(today.tokensSaved)} tokens saved   ${formatTokenCount(today.tokensUsed)} tokens used`);
  console.log(`    This week:   ${week.sessions} sessions   ${formatTokenCount(week.tokensSaved)} tokens saved   ${formatTokenCount(week.tokensUsed)} tokens used`);
  console.log(`    This month:  ${month.sessions} sessions   ${formatTokenCount(month.tokensSaved)} tokens saved   ${formatTokenCount(month.tokensUsed)} tokens used`);
  console.log(`    All time:    ${allTime.sessions} sessions   ${formatTokenCount(allTime.tokensSaved)} tokens saved   ${formatTokenCount(allTime.tokensUsed)} tokens used`);
  console.log('');

  // Recent runs
  const recent = getRecentRuns(logs, limit);
  if (recent.length > 0) {
    console.log(`  Recent sessions (last ${limit}):`);
    console.log('');

    for (const run of recent) {
      const date = new Date(run.date);
      const time = date.toLocaleString();
      const saved = run.tokensRaw - run.tokensPacked;
      const pct = run.tokensRaw > 0 ? Math.round((saved / run.tokensRaw) * 100) : 0;
      const compress = run.compressed ? ' --compress' : '';
      const agent = run.agent ? ` --agent ${run.agent}` : '';

      console.log(`    [${time}] ${run.command}${compress}${agent} → ${run.files} files`);
      console.log(`      Raw: ${formatTokenCount(run.tokensRaw)}  Packed: ${formatTokenCount(run.tokensPacked)}  Saved: ${formatTokenCount(saved)} (${pct}%)`);
      console.log('');
    }
  }
}

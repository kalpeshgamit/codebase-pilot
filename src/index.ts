export { detect } from './scanner/detector.js';
export { generateAgents } from './agents/generator.js';
export { generateClaudeMd } from './generators/claude-md.js';
export { generateClaudeignore } from './generators/claudeignore.js';
export { createMemoryDb } from './memory/db.js';
export { toPosix } from './utils.js';

// Registry exports
export { getAllLanguages, getLanguageByExt, getSkipDirs, getEntryPoints } from './registry/index.js';
export { getFrameworkDetectors, getTestRunnerDetectors, getOrmDetectors } from './registry/index.js';

// Type exports
export type {
  ProjectScan,
  LanguageInfo,
  DatabaseInfo,
  PackageInfo,
  ExistingConfig,
  AgentDefinition,
  DispatchPattern,
  AgentsConfig,
  HealthCheckResult,
} from './types.js';

export type {
  LanguageEntry,
  FrameworkDetector,
  TestRunnerDetector,
  OrmDetector,
  Tier,
} from './registry/types.js';

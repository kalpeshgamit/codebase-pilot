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

// Packer exports
export { packProject } from './packer/index.js';
export { collectFiles } from './packer/collector.js';
export type { CollectedFile, CollectOptions } from './packer/collector.js';
export { countTokens, formatTokenCount } from './packer/token-counter.js';
export { formatXml } from './packer/formatter-xml.js';
export { formatMarkdown } from './packer/formatter-md.js';
export type { PackOptions, PackResult } from './packer/index.js';

// Security exports
export { scanForSecrets, isEnvFile } from './security/scanner.js';
export type { SecretMatch } from './security/scanner.js';

// Compression exports
export { compress, compressCode } from './compress/index.js';
export type { CompressResult } from './compress/index.js';

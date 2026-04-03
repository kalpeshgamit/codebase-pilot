export interface ProjectScan {
  root: string;
  name: string;
  type: 'monorepo' | 'single-package';
  languages: LanguageInfo[];
  framework: string | null;
  database: DatabaseInfo | null;
  testRunner: string | null;
  packages: PackageInfo[];
  existing: ExistingConfig;
}

export interface LanguageInfo {
  name: string;
  extensions: string[];
  percentage: number;
  fileCount: number;
}

export interface DatabaseInfo {
  orm: string;
  type: string;
  schemaPath: string | null;
}

export interface PackageInfo {
  name: string;
  path: string;
  type: 'api' | 'web' | 'cli' | 'lib' | 'plugin' | 'database' | 'unknown';
  language: string;
  entryPoint: string | null;
  fileCount: number;
}

export interface ExistingConfig {
  claudeMd: boolean;
  claudeMdPath: string | null;
  claudeignore: boolean;
  claudeignorePath: string | null;
  agentsJson: boolean;
  mcpServers: string[];
}

export interface AgentDefinition {
  name: string;
  model: 'opus' | 'sonnet' | 'haiku';
  context: string[];
  task: string;
  layer: number;
  dependsOn: string[];
}

export interface DispatchPattern {
  name: string;
  agents: string[];
  description: string;
}

export interface AgentsConfig {
  version: string;
  project: string;
  agents: Record<string, AgentDefinition>;
  patterns: Record<string, string[]>;
}

export interface HealthCheckResult {
  agent: string;
  check: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
  fix?: string;
}

export type Tier = 1 | 2 | 3;

export interface LanguageEntry {
  name: string;
  extensions: string[];
  tier: Tier;
  skipDirs: string[];
  entryPoints: string[];
  packageFiles: string[];
}

export interface FrameworkDetector {
  name: string;
  language: string;
  detect: (root: string) => boolean;
  category: 'backend' | 'frontend' | 'fullstack' | 'mobile' | 'desktop';
}

export interface TestRunnerDetector {
  name: string;
  language: string;
  detect: (root: string) => boolean;
  command: string;
}

export interface OrmDetector {
  name: string;
  language: string;
  detect: (root: string) => string | null;
  schemaPaths: string[];
}

export interface PackageManagerEntry {
  name: string;
  language: string;
  lockFile: string | null;
  configFile: string;
  detect: (root: string) => boolean;
}

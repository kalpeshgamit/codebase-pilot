export interface CollectedFile {
  relativePath: string;
  content: string;
  language: string | null;
  tokens: number;
}

export interface CollectOptions {
  agentContextPaths?: string[];
  claudeignorePatterns?: string[];
}

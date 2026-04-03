export interface CompressionPattern {
  signature: RegExp;
  blockType: 'brace' | 'indent';
  placeholder: string;
}

export interface LanguageCompression {
  language: string;
  aliases: string[];
  preservePatterns: RegExp[];
  blockPatterns: CompressionPattern[];
}

export const COMPRESSION_LANGUAGES: LanguageCompression[] = [
  {
    language: 'TypeScript',
    aliases: ['JavaScript'],
    preservePatterns: [
      /^\s*import\s/,
      /^\s*export\s+(?:type|interface|enum)\s/,
      /^\s*(?:type|interface|enum)\s/,
    ],
    blockPatterns: [
      { signature: /^(\s*(?:export\s+)?(?:async\s+)?function\s+\w+[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
      { signature: /^(\s*(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
      { signature: /^(\s*(?:export\s+)?class\s+\w+[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
    ],
  },
  {
    language: 'Python',
    aliases: [],
    preservePatterns: [/^\s*(?:import|from)\s/, /^\s*class\s+\w+/, /^\s*@\w+/],
    blockPatterns: [
      { signature: /^(\s*(?:async\s+)?def\s+\w+\([^)]*\)[^:]*:)/, blockType: 'indent', placeholder: ' ...' },
    ],
  },
  {
    language: 'Go',
    aliases: [],
    preservePatterns: [/^\s*(?:import|package)\s/, /^\s*type\s+\w+\s+(?:struct|interface)\s/],
    blockPatterns: [
      { signature: /^(\s*func\s+(?:\([^)]*\)\s+)?\w+\([^)]*\)[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
    ],
  },
  {
    language: 'Rust',
    aliases: [],
    preservePatterns: [/^\s*use\s/, /^\s*(?:pub\s+)?(?:struct|enum|trait|type)\s/],
    blockPatterns: [
      { signature: /^(\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
      { signature: /^(\s*(?:pub\s+)?impl\s+[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
    ],
  },
  {
    language: 'Java',
    aliases: ['Kotlin'],
    preservePatterns: [/^\s*(?:import|package)\s/, /^\s*(?:public|private|protected)?\s*(?:abstract\s+)?(?:class|interface|enum|record)\s/],
    blockPatterns: [
      { signature: /^(\s*(?:public|private|protected)?\s*(?:static\s+)?(?:abstract\s+)?(?:synchronized\s+)?\w+(?:<[^>]*>)?\s+\w+\s*\([^)]*\)[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
    ],
  },
  {
    language: 'Ruby',
    aliases: [],
    preservePatterns: [/^\s*require/, /^\s*(?:class|module)\s/, /^\s*attr_/],
    blockPatterns: [
      { signature: /^(\s*def\s+\w+[^$]*)/, blockType: 'indent', placeholder: '\n    # ...\n  end' },
    ],
  },
  {
    language: 'PHP',
    aliases: [],
    preservePatterns: [/^\s*(?:use|namespace)\s/, /^\s*(?:class|interface|trait|enum)\s/],
    blockPatterns: [
      { signature: /^(\s*(?:public|private|protected)?\s*(?:static\s+)?function\s+\w+\s*\([^)]*\)[^{]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
    ],
  },
  {
    language: 'C++',
    aliases: ['C'],
    preservePatterns: [/^\s*#include/, /^\s*(?:class|struct|namespace|enum)\s/, /^\s*using\s/],
    blockPatterns: [
      { signature: /^(\s*(?:virtual\s+)?(?:static\s+)?(?:inline\s+)?(?:const\s+)?[\w:*&<>]+\s+\w+\s*\([^)]*\)[^{;]*)\{/, blockType: 'brace', placeholder: '{ /* ... */ }' },
    ],
  },
];

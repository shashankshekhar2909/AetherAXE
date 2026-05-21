/**
 * Shared Type Definitions for the Content Extraction Infrastructure.
 */

export interface AdvancedOptions {
  preserveTables: boolean;
  aiCleanupLevel: 'none' | 'conservative' | 'standard' | 'aggressive';
  ocrFallback: boolean;
  simulateJsRendering: boolean;
  excludeNavAndFooters: boolean;
  generateEmbeddings: boolean;
  chunkingStrategy: 'none' | 'semantic' | 'heading' | 'token';
  chunkSize: number;
  chunkOverlap: number;
}

export interface PipelineProgress {
  step: 'idle' | 'detect' | 'scrape' | 'clean' | 'ai_refine' | 'synthesize' | 'done' | 'error';
  message: string;
  percent: number;
}

export interface TableOfContentsEntry {
  level: number;
  text: string;
  anchor: string;
}

export interface DocumentMetadata {
  title: string;
  author: string;
  date: string;
  sourceUrl?: string;
  summary: string;
  tags: string[];
  entities: string[];
  confidenceScore: number;
  contentType: string;
  wordCount: number;
  toc: TableOfContentsEntry[];
}

export interface SemanticChunk {
  id: string;
  index: number;
  headingContext: string[];
  content: string;
  tokenCount: number;
  embedding?: number[];
}

export interface ExtractedAsset {
  id: string;
  type: string;
  originalName: string;
  extractedPath?: string;
  sizeBytes: number;
  altText?: string;
}

export interface ExtractionResult {
  id: string;
  sourceType: 'url' | 'file';
  originalSource: string;
  status: 'success' | 'failed';
  metadata: DocumentMetadata;
  markdown: string;
  chunks: SemanticChunk[];
  assets: ExtractedAsset[];
}

export interface IntegrationsConfig {
  notionToken?: string;
  notionPageId?: string;
  webhookUrl?: string;
  webhookAuthHeader?: string;
}

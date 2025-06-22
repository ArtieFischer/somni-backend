export interface IngestionConfig {
  interpreter: string;
  dataPath: string;
  batchSize: number;
  chunkOptions?: {
    targetSize?: number;
    overlapSize?: number;
    respectParagraphs?: boolean;
    respectSentences?: boolean;
    maxSize?: number;
    minSize?: number;
  };
  embeddingOptions?: {
    retryAttempts?: number;
    retryDelay?: number;
  };
}

export const INTERPRETER_CONFIGS: Record<string, Partial<IngestionConfig>> = {
  jung: {
    batchSize: 10, // Smaller dataset, can handle larger batches
    chunkOptions: {
      targetSize: 1000,
      overlapSize: 200,
      minSize: 300
    }
  },
  freud: {
    batchSize: 5, // Larger dataset, smaller batches
    chunkOptions: {
      targetSize: 1200, // Slightly larger chunks for theoretical content
      overlapSize: 250,
      minSize: 400
    }
  },
  mary: {
    batchSize: 8,
    chunkOptions: {
      targetSize: 1000,
      overlapSize: 150, // Less overlap for scientific content
      minSize: 300
    }
  },
  lakshmi: {
    batchSize: 8,
    chunkOptions: {
      targetSize: 900, // Smaller chunks for practice-oriented content
      overlapSize: 200,
      minSize: 250
    }
  }
};

export const DEFAULT_CONFIG: IngestionConfig = {
  interpreter: '',
  dataPath: '',
  batchSize: 5,
  chunkOptions: {
    targetSize: 1000,
    overlapSize: 200,
    respectParagraphs: true,
    respectSentences: true,
    maxSize: 1500,
    minSize: 300
  },
  embeddingOptions: {
    retryAttempts: 3,
    retryDelay: 1000
  }
};

export const DATA_PATHS = {
  jung: 'RAG-data/jung',
  freud: 'RAG-data/freud',
  mary: 'RAG-data/neurocognitive',
  lakshmi: 'RAG-data/new-age'
};

export function getInterpreterConfig(interpreter: string, basePath: string): IngestionConfig {
  const specificConfig = INTERPRETER_CONFIGS[interpreter] || {};
  const dataPath = `${basePath}/${DATA_PATHS[interpreter]}`;
  
  return {
    ...DEFAULT_CONFIG,
    ...specificConfig,
    interpreter,
    dataPath,
    chunkOptions: {
      ...DEFAULT_CONFIG.chunkOptions,
      ...specificConfig.chunkOptions
    },
    embeddingOptions: {
      ...DEFAULT_CONFIG.embeddingOptions,
      ...specificConfig.embeddingOptions
    }
  };
}
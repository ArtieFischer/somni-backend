import { pipeline, env } from '@xenova/transformers';

// Configure environment for better memory management
env.allowLocalModels = false;
env.useBrowserCache = false; // Disable browser cache
env.backends.onnx.wasm.numThreads = 1; // Limit threads to reduce memory usage

export class EmbeddingsService {
  private static instance: EmbeddingsService;
  private embedder: any = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): EmbeddingsService {
    if (!EmbeddingsService.instance) {
      EmbeddingsService.instance = new EmbeddingsService();
    }
    return EmbeddingsService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.embedder) return;
    
    if (!this.initPromise) {
      this.initPromise = this.doInitialize();
    }
    
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('Initializing embeddings model...');
      this.embedder = await pipeline(
        'feature-extraction',
        'Supabase/gte-small'
      );
      console.log('Embeddings model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize embeddings model:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });
      
      // Convert to regular array
      return Array.from(output.data);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize();
    
    const embeddings: number[][] = [];
    
    // Process one at a time to avoid memory issues
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  /**
   * Cleanup method to free memory
   */
  async cleanup(): Promise<void> {
    if (this.embedder) {
      // Clear the model from memory
      this.embedder = null;
      this.initPromise = null;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      console.log('Embeddings model cleared from memory');
    }
  }
}

// Export singleton instance
export const embeddingsService = EmbeddingsService.getInstance();
// Dynamic import will be handled in the initialize method
let pipeline: any;
let env: any;

export class EmbeddingsService {
  private static instance: EmbeddingsService;
  private embedder: any = null;
  private initPromise: Promise<void> | null = null;
  private transformersLoaded: boolean = false;

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
      // Dynamically import @xenova/transformers if not already loaded
      if (!this.transformersLoaded) {
        console.log('Loading @xenova/transformers...');
        // Use Function constructor to bypass TypeScript compilation
        const transformers = await (new Function('return import("@xenova/transformers")')());
        pipeline = transformers.pipeline;
        env = transformers.env;
        
        // Configure environment for better memory management
        env.allowLocalModels = false;
        env.useBrowserCache = false; // Disable browser cache
        env.backends.onnx.wasm.numThreads = 1; // Limit threads to reduce memory usage
        
        this.transformersLoaded = true;
        console.log('@xenova/transformers loaded successfully');
      }
      
      console.log('Initializing embeddings model...');
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/multi-qa-MiniLM-L6-cos-v1'
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
      this.transformersLoaded = false;
      
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
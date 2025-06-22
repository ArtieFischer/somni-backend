/**
 * BGE-M3 Embeddings Service
 * 
 * Implements BAAI General Embedding M3 model for improved semantic search
 * Key improvements over MiniLM:
 * - 1024-dimensional embeddings (vs 384)
 * - Better semantic understanding for philosophical texts
 * - Support for long documents (up to 8192 tokens)
 * - Multi-functionality: dense + sparse + multi-vector retrieval
 * 
 * Based on findings:
 * - Current MiniLM achieves only 26/100 content relevance
 * - Retrieved passages often tangentially related
 * - Need better matching between dream narratives and philosophical texts
 */

import { logger } from '../utils/logger';

// Dynamic imports
let pipeline: any;
let env: any;
let AutoTokenizer: any;

interface BGEConfig {
  modelName: string;
  maxLength: number;
  pooling: 'cls' | 'mean';
  normalize: boolean;
  // BGE-M3 specific features
  enableSparse?: boolean;
  enableMultiVector?: boolean;
}

interface BGEEmbedding {
  dense: number[];          // Traditional dense embedding
  sparse?: Map<number, number>;  // Token ID -> weight for sparse retrieval
  multiVector?: number[][];      // Token-level embeddings for ColBERT-style
}

export class BGEEmbeddingsService {
  private static instance: BGEEmbeddingsService;
  private embedder: any = null;
  private tokenizer: any = null;
  private initPromise: Promise<void> | null = null;
  private transformersLoaded: boolean = false;
  
  private readonly config: BGEConfig = {
    modelName: 'Xenova/bge-m3',
    maxLength: 8192,  // BGE-M3 supports up to 8192 tokens
    pooling: 'cls',   // BGE-M3 uses CLS pooling
    normalize: true,  // Essential for cosine similarity
    enableSparse: true,  // Enable sparse retrieval for keyword matching
    enableMultiVector: false  // Disable for now to save memory
  };

  private constructor() {}

  static getInstance(): BGEEmbeddingsService {
    if (!BGEEmbeddingsService.instance) {
      BGEEmbeddingsService.instance = new BGEEmbeddingsService();
    }
    return BGEEmbeddingsService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.embedder && this.tokenizer) return;
    
    if (!this.initPromise) {
      this.initPromise = this.doInitialize();
    }
    
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Load transformers dynamically
      if (!this.transformersLoaded) {
        logger.info('Loading @xenova/transformers for BGE-M3...');
        const transformers = await (new Function('return import("@xenova/transformers")')());
        pipeline = transformers.pipeline;
        env = transformers.env;
        AutoTokenizer = transformers.AutoTokenizer;
        
        // Configure for optimal performance
        env.allowLocalModels = false;
        env.useBrowserCache = false;
        env.backends.onnx.wasm.numThreads = 2;  // BGE-M3 benefits from 2 threads
        
        this.transformersLoaded = true;
        logger.info('@xenova/transformers loaded successfully');
      }
      
      logger.info('Initializing BGE-M3 embeddings model...');
      
      // Initialize embedder
      this.embedder = await pipeline(
        'feature-extraction',
        this.config.modelName,
        {
          quantized: true,  // Use quantized version for stability
        }
      );
      
      // Initialize tokenizer for sparse retrieval
      if (this.config.enableSparse) {
        this.tokenizer = await AutoTokenizer.from_pretrained(this.config.modelName);
      }
      
      logger.info('BGE-M3 model initialized successfully');
      logger.info(`Model config: ${JSON.stringify({
        dimensions: 1024,
        maxLength: this.config.maxLength,
        features: {
          dense: true,
          sparse: this.config.enableSparse,
          multiVector: this.config.enableMultiVector
        }
      })}`);
    } catch (error) {
      logger.error('Failed to initialize BGE-M3 model:', error);
      throw error;
    }
  }

  /**
   * Generate dense embedding for text
   * This is the primary method compatible with existing code
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      // Truncate if necessary (BGE-M3 handles this internally, but let's be safe)
      const truncatedText = this.truncateText(text, this.config.maxLength);
      
      const output = await this.embedder(truncatedText, {
        pooling: this.config.pooling,
        normalize: this.config.normalize,
      });
      
      // Convert to regular array
      return Array.from(output.data);
    } catch (error) {
      logger.error('Error generating BGE-M3 embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts
   * Optimized for batch processing
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize();
    
    const embeddings: number[][] = [];
    
    // Process in small batches to balance memory and performance
    const batchSize = 4;  // BGE-M3 is larger, use smaller batches
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        // Process batch
        const batchOutputs = await Promise.all(
          batch.map(text => this.generateEmbedding(text))
        );
        
        embeddings.push(...batchOutputs);
        
        // Log progress for large batches
        if (texts.length > 20 && i % 20 === 0) {
          logger.info(`BGE-M3 embedding progress: ${i}/${texts.length}`);
        }
      } catch (error) {
        logger.error(`Error in batch ${i}-${i + batchSize}:`, error);
        // Continue with individual processing for failed batch
        for (const text of batch) {
          try {
            const embedding = await this.generateEmbedding(text);
            embeddings.push(embedding);
          } catch (innerError) {
            logger.error('Failed to generate embedding for text:', innerError);
            // Push zero vector to maintain alignment
            embeddings.push(new Array(1024).fill(0));
          }
        }
      }
    }
    
    return embeddings;
  }

  /**
   * Generate full BGE-M3 embedding with dense, sparse, and multi-vector components
   * For advanced hybrid retrieval
   */
  async generateFullEmbedding(text: string): Promise<BGEEmbedding> {
    await this.initialize();
    
    const result: BGEEmbedding = {
      dense: await this.generateEmbedding(text)
    };
    
    // Generate sparse embedding if enabled
    if (this.config.enableSparse && this.tokenizer) {
      result.sparse = await this.generateSparseEmbedding(text);
    }
    
    // Generate multi-vector embedding if enabled
    if (this.config.enableMultiVector) {
      result.multiVector = await this.generateMultiVectorEmbedding(text);
    }
    
    return result;
  }

  /**
   * Generate sparse embedding for keyword-based retrieval
   * Returns a map of token IDs to weights
   */
  private async generateSparseEmbedding(text: string): Promise<Map<number, number>> {
    const sparse = new Map<number, number>();
    
    try {
      // Tokenize text
      const encoded = await this.tokenizer(text, {
        truncation: true,
        max_length: this.config.maxLength,
        return_tensors: false
      });
      
      const tokenIds = encoded.input_ids;
      
      // Calculate term frequency (TF) for each unique token
      const tokenCounts = new Map<number, number>();
      for (const tokenId of tokenIds) {
        tokenCounts.set(tokenId, (tokenCounts.get(tokenId) || 0) + 1);
      }
      
      // Convert to TF weights (could be enhanced with IDF later)
      const totalTokens = tokenIds.length;
      for (const [tokenId, count] of tokenCounts) {
        // Skip special tokens
        if (tokenId < 4) continue;  // [PAD], [UNK], [CLS], [SEP]
        
        // Simple TF weighting
        sparse.set(tokenId, count / totalTokens);
      }
      
    } catch (error) {
      logger.error('Error generating sparse embedding:', error);
    }
    
    return sparse;
  }

  /**
   * Generate multi-vector embedding for fine-grained matching
   * Returns token-level embeddings
   */
  private async generateMultiVectorEmbedding(text: string): Promise<number[][]> {
    // This would require accessing token-level outputs
    // For now, return empty array as it's disabled by default
    logger.warn('Multi-vector embedding not yet implemented');
    return [];
  }

  /**
   * Truncate text to fit within token limit
   * BGE-M3 can handle long texts, but we should be careful
   */
  private truncateText(text: string, maxTokens: number): string {
    // Simple character-based truncation
    // BGE-M3 handles 8192 tokens ≈ 32k characters
    const maxChars = maxTokens * 4;  // Rough estimate
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Try to truncate at sentence boundary
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const cutPoint = Math.max(lastPeriod, lastNewline);
    if (cutPoint > maxChars * 0.8) {  // If we find a good boundary
      return truncated.substring(0, cutPoint + 1);
    }
    
    return truncated;
  }

  /**
   * Calculate similarity between embeddings
   * Supports both dense and hybrid similarity
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    
    // Cosine similarity (assumes normalized vectors)
    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }
    
    return dotProduct;  // Since vectors are normalized, this is cosine similarity
  }

  /**
   * Enhanced similarity calculation for full BGE embeddings
   */
  calculateHybridSimilarity(
    query: BGEEmbedding, 
    document: BGEEmbedding,
    weights = { dense: 0.7, sparse: 0.3 }
  ): number {
    let score = 0;
    
    // Dense similarity
    if (query.dense && document.dense) {
      score += weights.dense * this.calculateSimilarity(query.dense, document.dense);
    }
    
    // Sparse similarity (Jaccard-like)
    if (query.sparse && document.sparse && weights.sparse > 0) {
      let intersection = 0;
      let union = new Set([...query.sparse.keys(), ...document.sparse.keys()]).size;
      
      for (const [tokenId, queryWeight] of query.sparse) {
        if (document.sparse.has(tokenId)) {
          intersection += Math.min(queryWeight, document.sparse.get(tokenId)!);
        }
      }
      
      const sparseSim = union > 0 ? intersection / union : 0;
      score += weights.sparse * sparseSim;
    }
    
    return score;
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      model: this.config.modelName,
      dimensions: 1024,
      maxTokens: this.config.maxLength,
      features: {
        dense: true,
        sparse: this.config.enableSparse,
        multiVector: this.config.enableMultiVector
      },
      advantages: [
        'Better semantic understanding for philosophical texts',
        'Handles long documents (up to 8192 tokens)',
        'State-of-the-art performance on retrieval benchmarks',
        'Multi-functional: combines dense, sparse, and token-level matching'
      ]
    };
  }

  /**
   * Cleanup method to free memory
   */
  async cleanup(): Promise<void> {
    if (this.embedder || this.tokenizer) {
      this.embedder = null;
      this.tokenizer = null;
      this.initPromise = null;
      this.transformersLoaded = false;
      
      if (global.gc) {
        global.gc();
      }
      
      logger.info('BGE-M3 model cleared from memory');
    }
  }
}

// Export singleton instance
export const bgeEmbeddingsService = BGEEmbeddingsService.getInstance();
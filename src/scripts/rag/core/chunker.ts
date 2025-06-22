interface Chunk {
  content: string;
  metadata: {
    source: string;
    chapter?: string;
    chapterNumber?: number;
    chunkIndex: number;
    totalChunks?: number;
    startChar: number;
    endChar: number;
    tokens?: number;
  };
}

interface ChunkOptions {
  targetSize: number;
  overlapSize: number;
  respectParagraphs: boolean;
  respectSentences: boolean;
  maxSize: number;
  minSize: number;
}

export class SmartChunker {
  private readonly defaultOptions: ChunkOptions = {
    targetSize: 700,       // Reduced from 1000 to 700 for better semantic focus
    overlapSize: 150,      // Reduced proportionally
    respectParagraphs: true,
    respectSentences: true,
    maxSize: 900,          // Reduced from 1500 to 900
    minSize: 200           // Reduced from 300 to 200
  };

  chunkText(
    text: string, 
    source: string,
    chapter?: string,
    chapterNumber?: number,
    options?: Partial<ChunkOptions>
  ): Chunk[] {
    const opts = { ...this.defaultOptions, ...options };
    const chunks: Chunk[] = [];
    
    // Clean up text
    text = text.trim();
    if (!text) return chunks;
    
    // Split into paragraphs first
    const paragraphs = this.splitIntoParagraphs(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;
    let processedLength = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      // Skip empty paragraphs
      if (!paragraph.trim()) continue;
      
      // If adding this paragraph exceeds target size and we have minimum content
      if (currentChunk.length > 0 && 
          currentChunk.length + paragraph.length > opts.targetSize && 
          currentChunk.length >= opts.minSize) {
        
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk,
          source,
          chapter,
          chapterNumber,
          chunkIndex++,
          startChar,
          startChar + currentChunk.length
        ));
        
        // Start new chunk with overlap
        const overlap = this.createOverlap(currentChunk, opts.overlapSize);
        startChar = startChar + currentChunk.length - overlap.length;
        currentChunk = overlap + paragraph;
      } else if (currentChunk.length + paragraph.length > opts.maxSize) {
        // Paragraph is too large, need to split it
        const sentences = this.splitIntoSentences(paragraph);
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > opts.maxSize && currentChunk.length >= opts.minSize) {
            // Save current chunk
            chunks.push(this.createChunk(
              currentChunk,
              source,
              chapter,
              chapterNumber,
              chunkIndex++,
              startChar,
              startChar + currentChunk.length
            ));
            
            const overlap = this.createOverlap(currentChunk, opts.overlapSize);
            startChar = startChar + currentChunk.length - overlap.length;
            currentChunk = overlap + sentence;
          } else {
            currentChunk += sentence;
          }
        }
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
      
      processedLength += paragraph.length;
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim().length >= opts.minSize) {
      chunks.push(this.createChunk(
        currentChunk,
        source,
        chapter,
        chapterNumber,
        chunkIndex++,
        startChar,
        startChar + currentChunk.length
      ));
    } else if (currentChunk.trim().length > 0 && chunks.length > 0) {
      // If last chunk is too small, append to previous chunk
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.content += '\n\n' + currentChunk.trim();
      lastChunk.metadata.endChar = startChar + currentChunk.length;
    }
    
    // Add total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  private splitIntoParagraphs(text: string): string[] {
    // Split by double newlines or common paragraph markers
    const paragraphs = text
      .split(/\n\s*\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // Further split very long paragraphs
    const result: string[] = [];
    for (const para of paragraphs) {
      if (para.length > this.defaultOptions.maxSize * 2) {
        // Split by single newlines if paragraph is too long
        const subParas = para.split(/\n/).filter(p => p.trim().length > 0);
        result.push(...subParas);
      } else {
        result.push(para);
      }
    }
    
    return result;
  }

  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting with abbreviation handling
    const abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'Ph.D.', 'M.D.', 'B.A.', 'M.A.', 'i.e.', 'e.g.', 'etc.', 'vs.'];
    
    // Temporarily replace abbreviations
    let processedText = text;
    const replacements: Array<[string, string]> = [];
    abbreviations.forEach((abbr, index) => {
      const placeholder = `__ABBR_${index}__`;
      if (processedText.includes(abbr)) {
        replacements.push([placeholder, abbr]);
        processedText = processedText.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), placeholder);
      }
    });
    
    // Split sentences
    const sentences = processedText.match(/[^.!?]+[.!?]+/g) || [processedText];
    
    // Restore abbreviations and clean up
    return sentences.map(sentence => {
      let restored = sentence;
      replacements.forEach(([placeholder, original]) => {
        restored = restored.replace(new RegExp(placeholder, 'g'), original);
      });
      return restored.trim() + ' ';
    });
  }

  private createOverlap(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }
    
    // Try to find a sentence boundary for cleaner overlap
    const overlapStart = Math.max(0, text.length - overlapSize);
    const overlapText = text.substring(overlapStart);
    
    // Look for sentence boundary
    const sentenceMatch = overlapText.match(/[.!?]\s+([A-Z])/);
    if (sentenceMatch && sentenceMatch.index) {
      const sentenceStart = sentenceMatch.index + sentenceMatch[0].length - 1;
      if (sentenceStart < overlapSize * 0.8) { // Don't lose too much overlap
        return overlapText.substring(sentenceStart).trim() + ' ';
      }
    }
    
    // Look for word boundary
    const wordMatch = overlapText.match(/\s+\S/);
    if (wordMatch && wordMatch.index) {
      return overlapText.substring(wordMatch.index + 1).trim() + ' ';
    }
    
    return overlapText.trim() + ' ';
  }

  private createChunk(
    content: string,
    source: string,
    chapter: string | undefined,
    chapterNumber: number | undefined,
    chunkIndex: number,
    startChar: number,
    endChar: number
  ): Chunk {
    const trimmedContent = content.trim();
    
    return {
      content: trimmedContent,
      metadata: {
        source,
        chapter,
        chapterNumber,
        chunkIndex,
        startChar,
        endChar,
        tokens: this.estimateTokens(trimmedContent)
      }
    };
  }

  private estimateTokens(text: string): number {
    // More accurate token estimation
    // Average English word is ~4-5 characters
    // Average token is ~4 characters (including spaces and punctuation)
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    // Use combination of word count and character count for better estimate
    const tokensByWords = words * 1.3; // Most words = 1 token, some = 2
    const tokensByChars = chars / 4;
    
    // Average the two estimates
    return Math.ceil((tokensByWords + tokensByChars) / 2);
  }

  // Utility method to analyze chunk statistics
  analyzeChunks(chunks: Chunk[]): {
    totalChunks: number;
    avgChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalTokens: number;
    avgTokens: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        avgChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalTokens: 0,
        avgTokens: 0
      };
    }
    
    const sizes = chunks.map(c => c.content.length);
    const tokens = chunks.map(c => c.metadata.tokens || 0);
    
    return {
      totalChunks: chunks.length,
      avgChunkSize: Math.round(sizes.reduce((a, b) => a + b, 0) / chunks.length),
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
      totalTokens: tokens.reduce((a, b) => a + b, 0),
      avgTokens: Math.round(tokens.reduce((a, b) => a + b, 0) / chunks.length)
    };
  }
}
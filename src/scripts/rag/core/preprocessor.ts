import * as fs from 'fs';
import * as path from 'path';

interface BookMetadata {
  title: string;
  author: string;
  year?: number;
  interpreter: string;
  filename: string;
  totalSize: number;
  estimatedChunks: number;
}

interface Chapter {
  title: string;
  number: number;
  content: string;
  startPos: number;
  endPos: number;
}

export class BookPreprocessor {
  private readonly bookMetadataMap: Record<string, Partial<BookMetadata>> = {
    // Jung books
    'archetypes.txt': {
      title: 'The Archetypes and the Collective Unconscious',
      author: 'Carl Jung',
      year: 1969
    },
    'dreams.txt': {
      title: 'Dreams',
      author: 'Carl Jung',
      year: 1974
    },
    'man-and-his-symbols.txt': {
      title: 'Man and His Symbols',
      author: 'Carl Jung',
      year: 1964
    },
    'memories-dreams-reflections.txt': {
      title: 'Memories, Dreams, Reflections',
      author: 'Carl Jung',
      year: 1963
    },
    
    // Freud books
    'interpretation-of-dreams.txt': {
      title: 'The Interpretation of Dreams',
      author: 'Sigmund Freud',
      year: 1899
    },
    'beyond-the-pleasure-principle.txt': {
      title: 'Beyond the Pleasure Principle',
      author: 'Sigmund Freud',
      year: 1920
    },
    'the-ego-and-the-id.txt': {
      title: 'The Ego and the Id',
      author: 'Sigmund Freud',
      year: 1923
    },
    'psychopathology-of-everyday-life.txt': {
      title: 'The Psychopathology of Everyday Life',
      author: 'Sigmund Freud',
      year: 1901
    },
    'totem-and-taboo.txt': {
      title: 'Totem and Taboo',
      author: 'Sigmund Freud',
      year: 1913
    },
    'three-essays-on-sexuality.txt': {
      title: 'Three Essays on the Theory of Sexuality',
      author: 'Sigmund Freud',
      year: 1905
    },
    'inhibitions-symptoms-and-anxiety.txt': {
      title: 'Inhibitions, Symptoms and Anxiety',
      author: 'Sigmund Freud',
      year: 1926
    },
    'moses-and-monotheism.txt': {
      title: 'Moses and Monotheism',
      author: 'Sigmund Freud',
      year: 1939
    },
    'the-unconscious.txt': {
      title: 'The Unconscious',
      author: 'Sigmund Freud',
      year: 1915
    },
    'jokes-and-their-relation-to-the-unconcious.txt': {
      title: 'Jokes and Their Relation to the Unconscious',
      author: 'Sigmund Freud',
      year: 1905
    },
    'on-dreams.txt': {
      title: 'On Dreams',
      author: 'Sigmund Freud',
      year: 1901
    },
    'new-intro-to-psychoanalysis.txt': {
      title: 'New Introductory Lectures on Psychoanalysis',
      author: 'Sigmund Freud',
      year: 1933
    },
    'introductory-lectures-dreams.txt': {
      title: 'Introductory Lectures on Psychoanalysis',
      author: 'Sigmund Freud',
      year: 1917
    },
    
    // Freud case studies
    'dora.txt': {
      title: 'Fragment of an Analysis of a Case of Hysteria (Dora)',
      author: 'Sigmund Freud',
      year: 1905
    },
    'little-hans.txt': {
      title: 'Analysis of a Phobia in a Five-year-old Boy (Little Hans)',
      author: 'Sigmund Freud',
      year: 1909
    },
    'rat-man.txt': {
      title: 'Notes Upon a Case of Obsessional Neurosis (Rat Man)',
      author: 'Sigmund Freud',
      year: 1909
    },
    'wolf-man.txt': {
      title: 'From the History of an Infantile Neurosis (Wolf Man)',
      author: 'Sigmund Freud',
      year: 1918
    },
    'companion.txt': {
      title: 'The Freud-Jung Letters',
      author: 'Sigmund Freud',
      year: 1974
    },
    
    // Mary/Neurocognitive books
    'The-Committee-of-Sleep.txt': {
      title: 'The Committee of Sleep',
      author: 'Deirdre Barrett',
      year: 2001
    },
    'This-Is-Why-You-Dream.txt': {
      title: 'This Is Why You Dream',
      author: 'Rahul Jandial',
      year: 2024
    },
    'dreaming-and-brain.txt': {
      title: 'Dreaming and the Brain',
      author: 'J. Allan Hobson',
      year: 2002
    },
    'neuroscience-of-sleep-and-dream.txt': {
      title: 'The Neuroscience of Sleep and Dreams',
      author: 'Patrick McNamara',
      year: 2019
    },
    'twenty-four-hour-mind.txt': {
      title: 'The Twenty-four Hour Mind',
      author: 'Rosalind Cartwright',
      year: 2010
    },
    'when-brain-dreams.txt': {
      title: 'When Brains Dream',
      author: 'Antonio Zadra and Robert Stickgold',
      year: 2021
    },
    
    // Lakshmi/New-Age books
    'Conscious-Dreaming.txt': {
      title: 'Conscious Dreaming',
      author: 'Robert Moss',
      year: 1996
    },
    'The-Tibetan-Yogas-of-Dream.txt': {
      title: 'The Tibetan Yogas of Dream and Sleep',
      author: 'Tenzin Wangyal Rinpoche',
      year: 1998
    },
    'creative-dreaming.txt': {
      title: 'Creative Dreaming',
      author: 'Patricia Garfield',
      year: 1974
    },
    'dream-yoga.txt': {
      title: 'Dream Yoga',
      author: 'Andrew Holecek',
      year: 2016
    },
    'dreams-of-awakening.txt': {
      title: 'Dreams of Awakening',
      author: 'Charlie Morley',
      year: 2013
    },
    'the-dream-book-symbols-for-self-understanding.txt': {
      title: 'The Dream Book: Symbols for Self-Understanding',
      author: 'Betty Bethards',
      year: 1983
    }
  };

  async preprocessBook(filePath: string, interpreter: string): Promise<{
    metadata: BookMetadata;
    chapters: Chapter[];
    content: string;
  }> {
    const filename = path.basename(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Extract metadata
    const metadata = this.extractBookMetadata(filename, content, interpreter);
    
    // Normalize text
    const normalizedContent = this.normalizeText(content);
    
    // Detect chapters
    const chapters = this.detectChapters(normalizedContent);
    
    return { metadata, chapters, content: normalizedContent };
  }

  private extractBookMetadata(
    filename: string, 
    content: string, 
    interpreter: string
  ): BookMetadata {
    const knownMetadata = this.bookMetadataMap[filename] || {};
    
    return {
      title: knownMetadata.title || this.extractTitleFromContent(content) || filename,
      author: knownMetadata.author || this.getAuthorForInterpreter(interpreter),
      year: knownMetadata.year,
      interpreter,
      filename,
      totalSize: content.length,
      estimatedChunks: Math.ceil(content.length / 3000) // Rough estimate
    };
  }

  private normalizeText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR errors
      .replace(/\bl\b/g, 'I')
      .replace(/\b0\b/g, 'O')
      // Remove page numbers and headers (improved patterns)
      .replace(/^\d+\s*$/gm, '')
      .replace(/^Page\s+\d+.*$/gmi, '')
      .replace(/^\[\d+\]\s*$/gm, '')
      // Preserve chapter markers
      .replace(/^(Chapter|CHAPTER|Part|PART)\s+(\d+|[IVXLCDM]+)[\s:.-]*(.*)$/gmi, (match) => `\n\n${match}\n\n`)
      // Ensure proper spacing after periods
      .replace(/\.(\w)/g, '. $1')
      // Remove multiple line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private detectChapters(content: string): Chapter[] {
    const chapters: Chapter[] = [];
    
    // Common chapter patterns
    const chapterPatterns = [
      /^(Chapter|CHAPTER)\s+(\d+|[IVXLCDM]+)[\s:.-]*(.*)$/mi,
      /^(Part|PART)\s+(\d+|[IVXLCDM]+)[\s:.-]*(.*)$/mi,
      /^(\d+)\.\s+([A-Z][^.!?]+)$/m,
      /^([IVXLCDM]+)\.\s+(.*)$/m
    ];
    
    // Collect all chapter matches
    const chapterMatches: Array<{index: number, title: string, number: string}> = [];
    
    for (const pattern of chapterPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        chapterMatches.push({
          index: match.index,
          number: match[2] || match[1],
          title: match[3] || match[2] || `Chapter ${match[2] || match[1]}`
        });
      }
    }
    
    // Sort by position in text
    chapterMatches.sort((a, b) => a.index - b.index);
    
    // Create chapters from matches
    let lastPos = 0;
    let chapterNumber = 0;
    
    for (const match of chapterMatches) {
      if (match.index > lastPos + 100) { // Avoid duplicate matches
        // Add content before this chapter as previous chapter's content
        if (chapters.length > 0) {
          chapters[chapters.length - 1].content = content.substring(chapters[chapters.length - 1].startPos, match.index).trim();
          chapters[chapters.length - 1].endPos = match.index;
        } else if (match.index > 500) {
          // Add introduction/preface if substantial content before first chapter
          chapters.push({
            title: 'Introduction',
            number: 0,
            content: content.substring(0, match.index).trim(),
            startPos: 0,
            endPos: match.index
          });
        }
        
        chapters.push({
          title: match.title.trim(),
          number: ++chapterNumber,
          content: '', // Will be filled later
          startPos: match.index,
          endPos: -1
        });
        
        lastPos = match.index;
      }
    }
    
    // Handle last chapter or whole book if no chapters found
    if (chapters.length > 0) {
      const lastChapter = chapters[chapters.length - 1];
      lastChapter.content = content.substring(lastChapter.startPos).trim();
      lastChapter.endPos = content.length;
    } else {
      // No chapters detected, treat as single document
      chapters.push({
        title: 'Full Text',
        number: 1,
        content: content.trim(),
        startPos: 0,
        endPos: content.length
      });
    }
    
    return chapters;
  }

  private extractTitleFromContent(content: string): string | null {
    // Try to extract title from first few lines
    const lines = content.split('\n').slice(0, 10);
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for title-like patterns
      if (trimmed.length > 10 && trimmed.length < 100 && 
          /[A-Z]/.test(trimmed) && 
          !trimmed.match(/^(Chapter|Part|Page|\d+)/i)) {
        return trimmed;
      }
    }
    return null;
  }

  private getAuthorForInterpreter(interpreter: string): string {
    const authorMap: Record<string, string> = {
      'jung': 'Carl Jung',
      'freud': 'Sigmund Freud',
      'mary': 'Various Neuroscientists',
      'lakshmi': 'Various Spiritual Teachers'
    };
    return authorMap[interpreter] || 'Unknown';
  }
}
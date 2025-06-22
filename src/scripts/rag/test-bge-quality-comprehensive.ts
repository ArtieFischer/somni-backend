import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { bgeHybridRAGService } from '../../services/hybrid-rag-bge.service';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

interface DreamTest {
  id: string;
  title: string;
  dream: string;
  expectedThemes: string[];
  expectedSymbols: string[];
  expectedConcepts: string[];
}

interface TestResult {
  dreamId: string;
  dreamTitle: string;
  dream: string;
  expectedThemes: string[];
  actualThemes: string[];
  expectedSymbols: string[];
  foundSymbols: string[];
  results: any[];
  scores: {
    themeMatch: number;
    contentRelevance: number;
    symbolDetection: number;
    overallQuality: number;
  };
  analysis: string;
}

class ComprehensiveBGETest {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  private dreams: DreamTest[] = [
    {
      id: 'shadow-chase',
      title: 'Chased by Shadow Figure',
      dream: "I was walking through a dark forest when I noticed a black shadowy figure following me. The faster I ran, the closer it seemed to get. When I finally stopped and turned to face it, I realized it looked exactly like me but with glowing red eyes.",
      expectedThemes: ['shadow', 'fear', 'self-confrontation'],
      expectedSymbols: ['shadow', 'forest', 'red eyes', 'dark'],
      expectedConcepts: ['shadow self', 'projection', 'unconscious']
    },
    
    {
      id: 'flying-freedom',
      title: 'Flying Over Mountains',
      dream: "I discovered I could fly by spreading my arms like wings. I soared over snow-capped mountains and felt an incredible sense of freedom and joy. Below me, I saw my childhood home looking tiny and insignificant.",
      expectedThemes: ['freedom', 'transcendence', 'perspective'],
      expectedSymbols: ['flying', 'mountains', 'wings', 'home'],
      expectedConcepts: ['individuation', 'liberation', 'spiritual growth']
    },
    
    {
      id: 'water-drowning',
      title: 'Drowning in Ocean',
      dream: "I was swimming in a vast ocean when suddenly the water turned black. I felt myself being pulled down by an invisible force. As I sank deeper, I saw ancient ruins and heard voices calling my name from the depths.",
      expectedThemes: ['unconscious', 'overwhelm', 'descent'],
      expectedSymbols: ['water', 'ocean', 'black', 'ruins', 'depths'],
      expectedConcepts: ['unconscious', 'collective unconscious', 'regression']
    },
    
    {
      id: 'mother-transformation',
      title: 'Mother Becomes Dragon',
      dream: "My mother was cooking in the kitchen when she suddenly transformed into a golden dragon. She breathed fire that didn't burn but instead filled the room with warm light. I felt both terrified and protected.",
      expectedThemes: ['mother', 'transformation', 'power'],
      expectedSymbols: ['mother', 'dragon', 'fire', 'gold', 'kitchen'],
      expectedConcepts: ['great mother', 'transformation', 'archetype']
    },
    
    {
      id: 'snake-wisdom',
      title: 'Speaking Serpent',
      dream: "A green serpent emerged from a hole in my garden and spoke to me in an ancient language I somehow understood. It told me secrets about the nature of time and showed me a golden apple that contained all knowledge.",
      expectedThemes: ['wisdom', 'knowledge', 'transformation'],
      expectedSymbols: ['snake', 'serpent', 'garden', 'apple', 'green'],
      expectedConcepts: ['wisdom', 'unconscious knowledge', 'transformation']
    },
    
    {
      id: 'death-rebirth',
      title: 'Dying and Being Reborn',
      dream: "I experienced my own death in the dream, watching my body from above. Then I was pulled through a tunnel of light and emerged as a baby in a different world where colors had sounds and time moved backwards.",
      expectedThemes: ['death', 'rebirth', 'transformation'],
      expectedSymbols: ['death', 'tunnel', 'light', 'baby'],
      expectedConcepts: ['death and rebirth', 'transformation', 'ego death']
    },
    
    {
      id: 'anima-guide',
      title: 'Mysterious Woman Guide',
      dream: "A beautiful woman in white appeared and led me through a labyrinth. She never spoke but I understood her perfectly. At the center of the labyrinth was a mirror showing not my reflection but my true self.",
      expectedThemes: ['anima', 'guidance', 'self-discovery'],
      expectedSymbols: ['woman', 'white', 'labyrinth', 'mirror'],
      expectedConcepts: ['anima', 'self', 'individuation']
    },
    
    {
      id: 'child-play',
      title: 'Eternal Child in Garden',
      dream: "I found myself as a child again in a magical garden where toys came alive. A wise old teddy bear told me I had forgotten how to play and that this was why I was unhappy in my waking life.",
      expectedThemes: ['child', 'play', 'innocence'],
      expectedSymbols: ['child', 'garden', 'toys', 'bear'],
      expectedConcepts: ['divine child', 'puer aeternus', 'playfulness']
    },
    
    {
      id: 'hero-quest',
      title: 'Slaying the Monster',
      dream: "I was given a sword and told I must slay a monster terrorizing a village. When I found the monster, it was chained and crying. I realized the real monster was the fear of the villagers, not the creature itself.",
      expectedThemes: ['hero', 'monster', 'projection'],
      expectedSymbols: ['sword', 'monster', 'village', 'chains'],
      expectedConcepts: ['hero journey', 'projection', 'collective shadow']
    },
    
    {
      id: 'mandala-vision',
      title: 'Cosmic Mandala',
      dream: "I saw a vast mandala in the sky made of stars and galaxies. As I watched, I realized I was both at the center and at every point of the circle simultaneously. The experience was both terrifying and ecstatic.",
      expectedThemes: ['wholeness', 'cosmos', 'unity'],
      expectedSymbols: ['mandala', 'stars', 'circle', 'center'],
      expectedConcepts: ['self', 'wholeness', 'individuation']
    },
    
    {
      id: 'tree-roots',
      title: 'Tree of Life',
      dream: "I became a great tree with roots extending deep into the earth and branches reaching to heaven. Through my roots I felt connected to all living things, and through my branches I touched the divine.",
      expectedThemes: ['connection', 'growth', 'spirituality'],
      expectedSymbols: ['tree', 'roots', 'branches', 'earth', 'heaven'],
      expectedConcepts: ['world tree', 'axis mundi', 'connection']
    },
    
    {
      id: 'mask-identity',
      title: 'Removing Masks',
      dream: "I was at a party where everyone wore masks. When I tried to remove mine, I found another underneath, and another. Each mask I removed revealed a different version of myself I had forgotten.",
      expectedThemes: ['identity', 'persona', 'authenticity'],
      expectedSymbols: ['mask', 'party', 'faces'],
      expectedConcepts: ['persona', 'false self', 'authenticity']
    },
    
    {
      id: 'bridge-crossing',
      title: 'Crossing the Bridge',
      dream: "I stood before a narrow bridge over a bottomless chasm. On the other side was a golden city. As I crossed, the bridge began to dissolve behind me. There was no going back.",
      expectedThemes: ['transition', 'courage', 'transformation'],
      expectedSymbols: ['bridge', 'chasm', 'city', 'gold'],
      expectedConcepts: ['transition', 'liminality', 'courage']
    },
    
    {
      id: 'animal-speech',
      title: 'Council of Animals',
      dream: "All the animals in the forest gathered in a circle and invited me to join them. Each animal spoke about what humans had forgotten. The owl spoke of wisdom, the wolf of loyalty, the deer of gentleness.",
      expectedThemes: ['nature', 'wisdom', 'instinct'],
      expectedSymbols: ['animals', 'forest', 'circle', 'owl', 'wolf', 'deer'],
      expectedConcepts: ['instincts', 'animal nature', 'wisdom']
    },
    
    {
      id: 'fire-transformation',
      title: 'Phoenix Rising',
      dream: "I watched myself burn in a great fire, feeling no pain but intense transformation. From my ashes rose a phoenix that was both me and not me. It spoke with my voice but carried the wisdom of ages.",
      expectedThemes: ['transformation', 'death', 'rebirth'],
      expectedSymbols: ['fire', 'phoenix', 'ashes', 'transformation'],
      expectedConcepts: ['transformation', 'death and rebirth', 'renewal']
    },
    
    {
      id: 'underground-journey',
      title: 'Descent to Underworld',
      dream: "I descended endless stairs into the earth where I found an underground city populated by my ancestors. They showed me a book containing my entire lineage and the patterns that repeat through generations.",
      expectedThemes: ['ancestry', 'unconscious', 'patterns'],
      expectedSymbols: ['stairs', 'underground', 'ancestors', 'book'],
      expectedConcepts: ['collective unconscious', 'ancestry', 'patterns']
    },
    
    {
      id: 'mirror-multiplication',
      title: 'Hall of Mirrors',
      dream: "I entered a hall of mirrors where each reflection showed a different potential version of my life. Some were successful, others tragic. I realized I was living all these lives simultaneously in parallel worlds.",
      expectedThemes: ['potential', 'multiplicity', 'choice'],
      expectedSymbols: ['mirrors', 'reflections', 'hall'],
      expectedConcepts: ['shadow', 'potential self', 'multiplicity']
    },
    
    {
      id: 'cosmic-egg',
      title: 'Birth from Cosmic Egg',
      dream: "I witnessed the universe being born from a cosmic egg. As it cracked open, I saw that I was both the observer and the egg itself. The shell fragments became stars and I was scattered across the cosmos.",
      expectedThemes: ['creation', 'unity', 'cosmos'],
      expectedSymbols: ['egg', 'cosmos', 'stars', 'birth'],
      expectedConcepts: ['cosmic consciousness', 'unity', 'creation']
    },
    
    {
      id: 'wise-elder',
      title: 'Meeting the Wise Old Man',
      dream: "An ancient man with a long white beard appeared at a crossroads and offered me a choice between three paths. He said each path would teach me something different but I could only choose one. The paths led to a mountain, an ocean, and a forest.",
      expectedThemes: ['wisdom', 'choice', 'guidance'],
      expectedSymbols: ['old man', 'crossroads', 'paths', 'mountain', 'ocean', 'forest'],
      expectedConcepts: ['wise old man', 'archetype', 'life choices']
    },
    
    {
      id: 'shadow-integration',
      title: 'Dancing with My Shadow',
      dream: "My shadow detached from me and began to dance. At first I was frightened, but then I joined the dance. As we danced together, my shadow and I began to merge, and I felt more complete than ever before.",
      expectedThemes: ['integration', 'shadow', 'wholeness'],
      expectedSymbols: ['shadow', 'dance', 'merging'],
      expectedConcepts: ['shadow integration', 'individuation', 'wholeness']
    }
  ];

  async runComprehensiveTest(): Promise<void> {
    logger.info('🚀 Starting comprehensive BGE-M3 quality test...');
    
    const results: TestResult[] = [];
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    for (const dream of this.dreams) {
      logger.info(`\n📊 Testing dream: ${dream.title}`);
      
      try {
        // Search for relevant passages
        const searchResults = await bgeHybridRAGService.searchKnowledge(dream.dream, {
          maxResults: 10,
          interpreterType: 'jung',
          useThemes: true,
          adaptiveScoring: true
        });
        
        // Analyze themes
        const { themes, concepts } = await this.analyzeThemes(dream.dream);
        
        // Calculate scores
        const scores = this.calculateScores(dream, searchResults, themes);
        
        // Create result
        const result: TestResult = {
          dreamId: dream.id,
          dreamTitle: dream.title,
          dream: dream.dream,
          expectedThemes: dream.expectedThemes,
          actualThemes: themes,
          expectedSymbols: dream.expectedSymbols,
          foundSymbols: this.extractFoundSymbols(searchResults),
          results: searchResults.map(r => ({
            content: r.content.substring(0, 200) + '...',
            source: r.source,
            chapter: r.chapter,
            score: r.scores.hybrid,
            themes: r.matchedThemes,
            type: r.metadata?.classification?.primary_type
          })),
          scores,
          analysis: this.generateAnalysis(dream, searchResults, scores)
        };
        
        results.push(result);
        
        // Log quick summary
        logger.info(`✅ Overall quality: ${(scores.overallQuality * 100).toFixed(1)}%`);
        
      } catch (error) {
        logger.error(`❌ Failed to test dream ${dream.id}:`, error);
      }
    }
    
    // Generate comprehensive report
    const report = this.generateComprehensiveReport(results);
    
    // Save report
    const reportPath = path.join(
      process.cwd(),
      `bge-quality-report-${timestamp}.md`
    );
    await fs.writeFile(reportPath, report);
    logger.info(`\n📄 Report saved to: ${reportPath}`);
    
    // Also save JSON data
    const jsonPath = path.join(
      process.cwd(),
      `bge-quality-data-${timestamp}.json`
    );
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
    logger.info(`📊 Data saved to: ${jsonPath}`);
    
    // Print summary
    this.printSummary(results);
  }

  private async analyzeThemes(dream: string): Promise<{
    themes: string[];
    concepts: string[];
  }> {
    // This would normally call the theme extraction service
    // For now, we'll do basic extraction
    const themes: string[] = [];
    const concepts: string[] = [];
    
    const dreamLower = dream.toLowerCase();
    
    // Check for common Jungian themes
    const jungianThemes = [
      'shadow', 'anima', 'animus', 'self', 'persona',
      'mother', 'father', 'child', 'wise old man',
      'death', 'rebirth', 'transformation', 'journey'
    ];
    
    for (const theme of jungianThemes) {
      if (dreamLower.includes(theme)) {
        themes.push(theme);
      }
    }
    
    return { themes, concepts };
  }

  private extractFoundSymbols(results: any[]): string[] {
    const symbols = new Set<string>();
    
    results.forEach(result => {
      if (result.metadata?.classification?.symbols_present) {
        result.metadata.classification.symbols_present.forEach((s: string) => 
          symbols.add(s)
        );
      }
    });
    
    return Array.from(symbols);
  }

  private calculateScores(
    dream: DreamTest,
    results: any[],
    foundThemes: string[]
  ): TestResult['scores'] {
    // Theme matching score
    const themeMatch = this.calculateThemeMatch(
      dream.expectedThemes,
      foundThemes
    );
    
    // Content relevance score
    const contentRelevance = this.calculateContentRelevance(
      dream.dream,
      results
    );
    
    // Symbol detection score
    const symbolDetection = this.calculateSymbolMatch(
      dream.expectedSymbols,
      this.extractFoundSymbols(results)
    );
    
    // Overall quality
    const overallQuality = (
      themeMatch * 0.3 +
      contentRelevance * 0.5 +
      symbolDetection * 0.2
    );
    
    return {
      themeMatch,
      contentRelevance,
      symbolDetection,
      overallQuality
    };
  }

  private calculateThemeMatch(expected: string[], found: string[]): number {
    if (expected.length === 0) return 1;
    
    const matches = expected.filter(theme => 
      found.some(f => f.toLowerCase().includes(theme.toLowerCase()))
    ).length;
    
    return matches / expected.length;
  }

  private calculateContentRelevance(dream: string, results: any[]): number {
    if (results.length === 0) return 0;
    
    const dreamWords = new Set(
      dream.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4)
    );
    
    let totalRelevance = 0;
    const topResults = results.slice(0, 5);
    
    topResults.forEach(result => {
      const resultWords = new Set(
        result.content.toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 4)
      );
      
      const overlap = Array.from(dreamWords)
        .filter(w => resultWords.has(w)).length;
      
      const relevance = overlap / dreamWords.size;
      totalRelevance += relevance * result.scores.hybrid;
    });
    
    return Math.min(1, totalRelevance / topResults.length);
  }

  private calculateSymbolMatch(expected: string[], found: string[]): number {
    if (expected.length === 0) return 1;
    
    const matches = expected.filter(symbol => 
      found.some(f => f.toLowerCase().includes(symbol.toLowerCase()))
    ).length;
    
    return matches / expected.length;
  }

  private generateAnalysis(
    dream: DreamTest,
    results: any[],
    scores: TestResult['scores']
  ): string {
    const analysis: string[] = [];
    
    // Overall assessment
    if (scores.overallQuality > 0.8) {
      analysis.push('Excellent match quality with highly relevant passages.');
    } else if (scores.overallQuality > 0.6) {
      analysis.push('Good match quality with relevant passages.');
    } else if (scores.overallQuality > 0.4) {
      analysis.push('Moderate match quality with some relevant passages.');
    } else {
      analysis.push('Poor match quality with limited relevant passages.');
    }
    
    // Theme analysis
    if (scores.themeMatch < 0.5) {
      analysis.push('Theme detection needs improvement - missing key themes.');
    }
    
    // Content relevance
    if (scores.contentRelevance < 0.3) {
      analysis.push('Retrieved passages have low relevance to the dream content.');
    }
    
    // Top result analysis
    if (results.length > 0 && results[0].scores.hybrid > 0.8) {
      analysis.push('Top result shows excellent semantic alignment.');
    }
    
    return analysis.join(' ');
  }

  private generateComprehensiveReport(results: TestResult[]): string {
    const report: string[] = [];
    
    report.push('# BGE-M3 RAG System Quality Assessment Report');
    report.push(`\nGenerated: ${new Date().toISOString()}`);
    report.push(`\nTotal Dreams Tested: ${results.length}`);
    
    // Overall statistics
    const avgScores = this.calculateAverageScores(results);
    
    report.push('\n## Overall Performance Metrics');
    report.push(`- **Average Overall Quality**: ${(avgScores.overall * 100).toFixed(1)}%`);
    report.push(`- **Average Theme Match**: ${(avgScores.themeMatch * 100).toFixed(1)}%`);
    report.push(`- **Average Content Relevance**: ${(avgScores.contentRelevance * 100).toFixed(1)}%`);
    report.push(`- **Average Symbol Detection**: ${(avgScores.symbolDetection * 100).toFixed(1)}%`);
    
    // Performance categories
    const excellent = results.filter(r => r.scores.overallQuality > 0.8).length;
    const good = results.filter(r => r.scores.overallQuality > 0.6 && r.scores.overallQuality <= 0.8).length;
    const moderate = results.filter(r => r.scores.overallQuality > 0.4 && r.scores.overallQuality <= 0.6).length;
    const poor = results.filter(r => r.scores.overallQuality <= 0.4).length;
    
    report.push('\n## Performance Distribution');
    report.push(`- Excellent (>80%): ${excellent} dreams`);
    report.push(`- Good (60-80%): ${good} dreams`);
    report.push(`- Moderate (40-60%): ${moderate} dreams`);
    report.push(`- Poor (<40%): ${poor} dreams`);
    
    // Detailed results
    report.push('\n## Detailed Dream Analysis');
    
    results.forEach((result, index) => {
      report.push(`\n### ${index + 1}. ${result.dreamTitle}`);
      report.push(`\n**Dream**: "${result.dream}"`);
      
      report.push('\n**Scores**:');
      report.push(`- Overall Quality: ${(result.scores.overallQuality * 100).toFixed(1)}%`);
      report.push(`- Theme Match: ${(result.scores.themeMatch * 100).toFixed(1)}%`);
      report.push(`- Content Relevance: ${(result.scores.contentRelevance * 100).toFixed(1)}%`);
      report.push(`- Symbol Detection: ${(result.scores.symbolDetection * 100).toFixed(1)}%`);
      
      report.push('\n**Expected vs Found**:');
      report.push(`- Expected Themes: ${result.expectedThemes.join(', ')}`);
      report.push(`- Found Themes: ${result.actualThemes.join(', ') || 'None'}`);
      
      report.push('\n**Analysis**: ' + result.analysis);
      
      report.push('\n**Top 3 Retrieved Passages**:');
      result.results.slice(0, 3).forEach((r, i) => {
        report.push(`\n${i + 1}. **Source**: ${r.source} ${r.chapter ? `(${r.chapter})` : ''}`);
        report.push(`   - Score: ${(r.score * 100).toFixed(1)}%`);
        report.push(`   - Type: ${r.type}`);
        report.push(`   - Content: "${r.content}"`);
      });
    });
    
    // Recommendations
    report.push('\n## Recommendations for Improvement');
    
    if (avgScores.themeMatch < 0.6) {
      report.push('- **Enhance theme detection**: The system is missing many expected themes. Consider improving theme extraction algorithms.');
    }
    
    if (avgScores.contentRelevance < 0.5) {
      report.push('- **Improve semantic matching**: Retrieved passages often have low relevance. Consider adjusting embedding weights or similarity thresholds.');
    }
    
    if (avgScores.symbolDetection < 0.5) {
      report.push('- **Better symbol recognition**: Many symbolic elements are not being detected. Enhance symbol extraction patterns.');
    }
    
    // Find patterns in poor results
    const poorResults = results.filter(r => r.scores.overallQuality < 0.5);
    if (poorResults.length > 0) {
      report.push('\n### Patterns in Poor Results:');
      const commonIssues = this.identifyCommonIssues(poorResults);
      commonIssues.forEach(issue => report.push(`- ${issue}`));
    }
    
    return report.join('\n');
  }

  private calculateAverageScores(results: TestResult[]): {
    overall: number;
    themeMatch: number;
    contentRelevance: number;
    symbolDetection: number;
  } {
    const sum = results.reduce((acc, r) => ({
      overall: acc.overall + r.scores.overallQuality,
      themeMatch: acc.themeMatch + r.scores.themeMatch,
      contentRelevance: acc.contentRelevance + r.scores.contentRelevance,
      symbolDetection: acc.symbolDetection + r.scores.symbolDetection
    }), { overall: 0, themeMatch: 0, contentRelevance: 0, symbolDetection: 0 });
    
    const count = results.length;
    
    return {
      overall: sum.overall / count,
      themeMatch: sum.themeMatch / count,
      contentRelevance: sum.contentRelevance / count,
      symbolDetection: sum.symbolDetection / count
    };
  }

  private identifyCommonIssues(poorResults: TestResult[]): string[] {
    const issues: string[] = [];
    
    // Check for theme detection issues
    const themeIssues = poorResults.filter(r => r.scores.themeMatch < 0.3);
    if (themeIssues.length > poorResults.length * 0.5) {
      issues.push('Systematic failure in theme detection across multiple dreams');
    }
    
    // Check for relevance issues
    const relevanceIssues = poorResults.filter(r => r.scores.contentRelevance < 0.3);
    if (relevanceIssues.length > poorResults.length * 0.5) {
      issues.push('Retrieved content frequently lacks relevance to dream narratives');
    }
    
    // Check for specific dream types
    const shadowDreams = poorResults.filter(r => r.dream.toLowerCase().includes('shadow'));
    if (shadowDreams.length > 2) {
      issues.push('Poor performance on shadow-related dreams');
    }
    
    return issues;
  }

  private printSummary(results: TestResult[]): void {
    const avgScores = this.calculateAverageScores(results);
    
    console.log('\n' + '='.repeat(60));
    console.log('QUALITY ASSESSMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Quality: ${(avgScores.overall * 100).toFixed(1)}%`);
    console.log(`Theme Matching: ${(avgScores.themeMatch * 100).toFixed(1)}%`);
    console.log(`Content Relevance: ${(avgScores.contentRelevance * 100).toFixed(1)}%`);
    console.log(`Symbol Detection: ${(avgScores.symbolDetection * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
  }
}

// Run test
if (require.main === module) {
  const tester = new ComprehensiveBGETest();
  
  tester.runComprehensiveTest()
    .then(() => {
      logger.info('✅ Comprehensive test completed!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}
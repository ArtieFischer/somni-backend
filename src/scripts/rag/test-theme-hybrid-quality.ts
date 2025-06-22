import { hybridRAGService } from '../../services/hybrid-rag.service';
import { jungianThemeMapper } from './core/jungian-theme-mapper';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  id: string;
  category: string;
  dream: string;
  expectedThemes: string[];
  expectedConcepts: string[];
  qualityIndicators: {
    shouldMentionTerms?: string[];
    shouldAddressTopics?: string[];
    shouldRelateToArchetypes?: string[];
  };
}

interface TestResult {
  testId: string;
  category: string;
  dream: string;
  detectedThemes: string[];
  mappedConcepts: string[];
  topResults: Array<{
    content: string;
    source: string;
    scores: any;
    metadata?: any;
  }>;
  qualityMetrics: {
    themeDetectionAccuracy: number;
    conceptMappingAccuracy: number;
    contentRelevanceScore: number;
    archetypeAlignment: number;
    interpretiveValue: number;
  };
  qualityAnalysis: string;
}

class ThemeHybridQualityTester {
  private testCases: TestCase[] = [
    // Modern Technology Dreams
    {
      id: 'tech-1',
      category: 'Modern Technology',
      dream: "I dreamed that an AI was analyzing my dreams and knew me better than I knew myself. It predicted my future based on my unconscious patterns.",
      expectedThemes: ['ai'],
      expectedConcepts: ['Shadow', 'Collective Unconscious'],
      qualityIndicators: {
        shouldMentionTerms: ['shadow', 'projection', 'unconscious'],
        shouldAddressTopics: ['self-knowledge', 'hidden aspects', 'technology as mirror'],
        shouldRelateToArchetypes: ['Shadow', 'Wise Old Man']
      }
    },
    {
      id: 'tech-2',
      category: 'Modern Technology',
      dream: "In my dream, I was trapped in a virtual reality game where I had to face different versions of myself to escape.",
      expectedThemes: ['virtual_reality'],
      expectedConcepts: ['Persona', 'Reality vs Illusion'],
      qualityIndicators: {
        shouldMentionTerms: ['persona', 'mask', 'illusion', 'reality'],
        shouldAddressTopics: ['multiple selves', 'authentic self', 'maya'],
        shouldRelateToArchetypes: ['Persona', 'Self']
      }
    },
    {
      id: 'tech-3',
      category: 'Modern Technology',
      dream: "Everyone in my dream was filming me with their phones. I felt exposed and couldn't find anywhere to hide my true self.",
      expectedThemes: ['social_media'],
      expectedConcepts: ['Persona', 'Projection'],
      qualityIndicators: {
        shouldMentionTerms: ['persona', 'public face', 'projection', 'exposure'],
        shouldAddressTopics: ['social mask', 'authentic vs performed self', 'collective watching'],
        shouldRelateToArchetypes: ['Persona']
      }
    },

    // Classic Jungian Symbols
    {
      id: 'jung-1',
      category: 'Classic Jungian',
      dream: "A wise old man appeared in my dream and gave me a book that contained the story of my life, but the ending was written in symbols I couldn't understand.",
      expectedThemes: [],
      expectedConcepts: ['Self', 'Wise Old Man'],
      qualityIndicators: {
        shouldMentionTerms: ['wise old man', 'Self', 'individuation', 'symbols'],
        shouldAddressTopics: ['guidance', 'wisdom', 'life meaning', 'unconscious knowledge'],
        shouldRelateToArchetypes: ['Wise Old Man', 'Self']
      }
    },
    {
      id: 'jung-2',
      category: 'Classic Jungian',
      dream: "I dreamed of descending into a dark cave where I met my shadow - it looked like me but with all the qualities I hate about myself.",
      expectedThemes: ['shadow'],
      expectedConcepts: ['Shadow'],
      qualityIndicators: {
        shouldMentionTerms: ['shadow', 'rejected', 'integration', 'descent'],
        shouldAddressTopics: ['confronting shadow', 'rejected aspects', 'self-acceptance'],
        shouldRelateToArchetypes: ['Shadow']
      }
    },
    {
      id: 'jung-3',
      category: 'Classic Jungian',
      dream: "In my dream, I was both male and female, switching between the two forms as I navigated different challenges.",
      expectedThemes: [],
      expectedConcepts: ['Anima/Animus'],
      qualityIndicators: {
        shouldMentionTerms: ['anima', 'animus', 'contrasexual', 'integration'],
        shouldAddressTopics: ['inner masculine/feminine', 'psychological wholeness', 'balance'],
        shouldRelateToArchetypes: ['Anima', 'Animus']
      }
    },

    // Transformation Dreams
    {
      id: 'trans-1',
      category: 'Transformation',
      dream: "A black snake in my dream shed its skin and became golden. It spoke to me about the necessity of letting go of my old self.",
      expectedThemes: ['snake'],
      expectedConcepts: ['Transformation Symbol', 'Shadow'],
      qualityIndicators: {
        shouldMentionTerms: ['transformation', 'snake', 'renewal', 'shedding'],
        shouldAddressTopics: ['death and rebirth', 'letting go', 'psychological renewal'],
        shouldRelateToArchetypes: ['Ouroboros', 'Self']
      }
    },
    {
      id: 'trans-2',
      category: 'Transformation',
      dream: "I died in my dream but watched my own funeral from above. Then I was reborn as a child with all my current knowledge intact.",
      expectedThemes: ['death'],
      expectedConcepts: ['Psychic Death and Rebirth', 'Self'],
      qualityIndicators: {
        shouldMentionTerms: ['death', 'rebirth', 'transformation', 'renewal'],
        shouldAddressTopics: ['ego death', 'psychological transformation', 'new beginning'],
        shouldRelateToArchetypes: ['Divine Child', 'Self']
      }
    },

    // Relationship Dreams
    {
      id: 'rel-1',
      category: 'Relationships',
      dream: "My ex-partner appeared in my dream as a wise teacher, showing me aspects of myself I had never recognized before.",
      expectedThemes: ['ex_partner'],
      expectedConcepts: ['Anima/Animus', 'Unlived Life'],
      qualityIndicators: {
        shouldMentionTerms: ['projection', 'anima', 'animus', 'unlived'],
        shouldAddressTopics: ['reclaiming projections', 'inner wisdom', 'relationship as mirror'],
        shouldRelateToArchetypes: ['Anima/Animus']
      }
    },
    {
      id: 'rel-2',
      category: 'Relationships',
      dream: "In my dream, my best friend betrayed me, but then I realized I was actually betraying myself by not being authentic.",
      expectedThemes: ['betrayal'],
      expectedConcepts: ['Shadow', 'Projection'],
      qualityIndicators: {
        shouldMentionTerms: ['betrayal', 'shadow', 'projection', 'authentic'],
        shouldAddressTopics: ['self-betrayal', 'projection of shadow', 'authenticity'],
        shouldRelateToArchetypes: ['Shadow']
      }
    },

    // Movement Dreams
    {
      id: 'move-1',
      category: 'Movement',
      dream: "I was flying above the clouds, feeling godlike and powerful, but suddenly realized I had no idea how to land safely.",
      expectedThemes: ['flying'],
      expectedConcepts: ['Spiritual Liberation', 'Inflation'],
      qualityIndicators: {
        shouldMentionTerms: ['inflation', 'flying', 'hubris', 'grounding'],
        shouldAddressTopics: ['ego inflation', 'spiritual bypass', 'need for grounding'],
        shouldRelateToArchetypes: ['Puer Aeternus', 'Icarus']
      }
    },
    {
      id: 'move-2',
      category: 'Movement',
      dream: "I kept falling through endless darkness, but instead of fear, I felt a strange peace and acceptance.",
      expectedThemes: ['falling'],
      expectedConcepts: ['Loss of Ego Control', 'Shadow'],
      qualityIndicators: {
        shouldMentionTerms: ['falling', 'surrender', 'ego', 'unconscious'],
        shouldAddressTopics: ['letting go', 'descent into unconscious', 'ego dissolution'],
        shouldRelateToArchetypes: ['Shadow', 'Self']
      }
    },
    {
      id: 'move-3',
      category: 'Movement',
      dream: "Something dark and formless was chasing me through a maze. Every time I thought I escaped, it appeared in front of me.",
      expectedThemes: ['being_chased'],
      expectedConcepts: ['Shadow', 'Repressed Content'],
      qualityIndicators: {
        shouldMentionTerms: ['shadow', 'chasing', 'repressed', 'confrontation'],
        shouldAddressTopics: ['avoiding shadow', 'inescapable unconscious content', 'need for integration'],
        shouldRelateToArchetypes: ['Shadow']
      }
    },

    // Modern Anxieties
    {
      id: 'anx-1',
      category: 'Modern Anxieties',
      dream: "The earth was dying in my dream, and I was trying to save it but felt powerless against the collective destruction.",
      expectedThemes: ['climate_change'],
      expectedConcepts: ['Collective Unconscious', 'World Soul (Anima Mundi)'],
      qualityIndicators: {
        shouldMentionTerms: ['collective', 'world soul', 'anima mundi', 'responsibility'],
        shouldAddressTopics: ['collective shadow', 'environmental psyche', 'powerlessness vs action'],
        shouldRelateToArchetypes: ['Great Mother', 'Collective Unconscious']
      }
    },

    // Complex Mixed Dreams
    {
      id: 'complex-1',
      category: 'Complex',
      dream: "I was in a virtual reality where I could fly, but my shadow on the ground was a snake that grew larger the higher I flew.",
      expectedThemes: ['virtual_reality', 'flying', 'shadow', 'snake'],
      expectedConcepts: ['Persona', 'Shadow', 'Inflation', 'Transformation Symbol'],
      qualityIndicators: {
        shouldMentionTerms: ['shadow', 'inflation', 'transformation', 'compensation'],
        shouldAddressTopics: ['inflated persona', 'compensatory shadow', 'virtual vs real self'],
        shouldRelateToArchetypes: ['Shadow', 'Persona', 'Ouroboros']
      }
    },
    {
      id: 'complex-2',
      category: 'Complex',
      dream: "My phone turned into a wise old woman who showed me that my social media posts were creating a false persona that was eating my true self.",
      expectedThemes: ['social_media'],
      expectedConcepts: ['Persona', 'Wise Old Woman', 'Self'],
      qualityIndicators: {
        shouldMentionTerms: ['persona', 'wise woman', 'false self', 'authenticity'],
        shouldAddressTopics: ['digital persona', 'wisdom of the unconscious', 'self-consumption'],
        shouldRelateToArchetypes: ['Wise Old Woman', 'Persona', 'Self']
      }
    },

    // Archetypal Journey Dreams
    {
      id: 'journey-1',
      category: 'Archetypal Journey',
      dream: "I entered a labyrinth where each turn revealed a different version of myself - child, warrior, lover, sage - until I reached the center where they all merged into one.",
      expectedThemes: [],
      expectedConcepts: ['Self', 'Individuation'],
      qualityIndicators: {
        shouldMentionTerms: ['individuation', 'Self', 'wholeness', 'integration'],
        shouldAddressTopics: ['hero\'s journey', 'aspects of self', 'psychological wholeness'],
        shouldRelateToArchetypes: ['Self', 'Hero', 'Child', 'Warrior', 'Lover', 'Sage']
      }
    },
    {
      id: 'journey-2',
      category: 'Archetypal Journey',
      dream: "A golden mandala appeared in my dream, and as I walked toward it, all my fears and shadows were drawn into its center and transformed into light.",
      expectedThemes: [],
      expectedConcepts: ['Self', 'Shadow'],
      qualityIndicators: {
        shouldMentionTerms: ['mandala', 'Self', 'transformation', 'wholeness'],
        shouldAddressTopics: ['centering', 'shadow integration', 'enlightenment'],
        shouldRelateToArchetypes: ['Self', 'Mandala']
      }
    },

    // Cultural/Collective Dreams
    {
      id: 'collective-1',
      category: 'Collective',
      dream: "I dreamed I was part of an ancient ritual where the entire tribe was facing a collective shadow in the form of a giant dark cloud.",
      expectedThemes: ['shadow'],
      expectedConcepts: ['Collective Unconscious', 'Shadow'],
      qualityIndicators: {
        shouldMentionTerms: ['collective shadow', 'ritual', 'tribal', 'unconscious'],
        shouldAddressTopics: ['collective healing', 'shared shadow', 'ritual transformation'],
        shouldRelateToArchetypes: ['Collective Unconscious', 'Shadow']
      }
    },
    {
      id: 'collective-2',
      category: 'Collective',
      dream: "In my dream, humanity was uploading their consciousness to AI, but I chose to remain human and guard the collective unconscious.",
      expectedThemes: ['ai'],
      expectedConcepts: ['Collective Unconscious', 'Shadow'],
      qualityIndicators: {
        shouldMentionTerms: ['collective unconscious', 'humanity', 'consciousness', 'guardian'],
        shouldAddressTopics: ['technological shadow', 'preserving humanity', 'collective soul'],
        shouldRelateToArchetypes: ['Guardian', 'Collective Unconscious']
      }
    }
  ];

  async runQualityTests(): Promise<void> {
    console.log('🧪 Theme-Based Hybrid RAG Quality Assessment');
    console.log('=' .repeat(80));
    console.log(`Testing ${this.testCases.length} dreams across ${new Set(this.testCases.map(t => t.category)).size} categories\n`);

    const results: TestResult[] = [];
    const startTime = Date.now();

    for (const testCase of this.testCases) {
      console.log(`\n📊 Test ${testCase.id}: ${testCase.category}`);
      console.log('Dream:', testCase.dream.substring(0, 80) + '...');
      
      try {
        const result = await this.evaluateTestCase(testCase);
        results.push(result);
        
        console.log('✅ Detected themes:', result.detectedThemes);
        console.log('🎯 Quality score:', result.qualityMetrics.interpretiveValue.toFixed(2) + '/100');
      } catch (error) {
        console.error(`❌ Test ${testCase.id} failed:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    // Generate comprehensive report
    const report = this.generateQualityReport(results, duration);
    
    // Save to file
    const outputPath = path.join(process.cwd(), 'theme-hybrid-quality-report.json');
    const readablePath = path.join(process.cwd(), 'theme-hybrid-quality-report.md');
    
    fs.writeFileSync(outputPath, JSON.stringify({ 
      timestamp: new Date().toISOString(),
      duration: duration,
      results: results,
      summary: report.summary
    }, null, 2));
    
    fs.writeFileSync(readablePath, report.markdown);
    
    console.log(`\n📄 Report saved to:`);
    console.log(`   - JSON: ${outputPath}`);
    console.log(`   - Markdown: ${readablePath}`);
  }

  private async evaluateTestCase(testCase: TestCase): Promise<TestResult> {
    // Extract themes from dream
    const queryThemes = this.extractThemesFromQuery(testCase.dream);
    
    // Map to Jungian concepts
    const { concepts, interpretiveHints } = jungianThemeMapper.mapDreamToJungianConcepts(queryThemes);
    
    // Perform hybrid search
    const searchResults = await hybridRAGService.searchKnowledge(testCase.dream, {
      interpreterType: 'jung',
      maxResults: 5,
      bm25Weight: 0.4,
      semanticWeight: 0.6
    });
    
    // Evaluate quality metrics
    const qualityMetrics = this.evaluateQuality(
      testCase,
      queryThemes,
      Array.from(concepts),
      searchResults,
      interpretiveHints
    );
    
    // Generate quality analysis
    const qualityAnalysis = this.analyzeQuality(testCase, searchResults, qualityMetrics);
    
    return {
      testId: testCase.id,
      category: testCase.category,
      dream: testCase.dream,
      detectedThemes: queryThemes,
      mappedConcepts: Array.from(concepts),
      topResults: searchResults.map(r => ({
        content: r.content.substring(0, 200) + '...',
        source: r.source,
        scores: r.scores,
        metadata: r.metadata
      })),
      qualityMetrics,
      qualityAnalysis
    };
  }

  private extractThemesFromQuery(query: string): string[] {
    // This should match the extraction logic in hybrid-rag.service.ts
    const themes: string[] = [];
    const queryLower = query.toLowerCase();
    
    const themeKeywords: Record<string, string> = {
      'snake': 'snake',
      'serpent': 'snake',
      'flying': 'flying',
      'fly': 'flying',
      'falling': 'falling',
      'fall': 'falling',
      'chase': 'being_chased',
      'chasing': 'being_chased',
      'pursued': 'being_chased',
      'death': 'death',
      'dying': 'death',
      'die': 'death',
      'ai': 'ai',
      'artificial intelligence': 'ai',
      'robot': 'ai',
      'virtual reality': 'virtual_reality',
      'vr': 'virtual_reality',
      'social media': 'social_media',
      'phone': 'social_media',
      'shadow': 'shadow',
      'dark version': 'shadow',
      'betrayal': 'betrayal',
      'betrayed': 'betrayal',
      'ex': 'ex_partner',
      'ex-partner': 'ex_partner',
      'climate': 'climate_change',
      'earth was dying': 'climate_change'
    };
    
    for (const [keyword, themeCode] of Object.entries(themeKeywords)) {
      if (queryLower.includes(keyword) && !themes.includes(themeCode)) {
        themes.push(themeCode);
      }
    }
    
    return themes;
  }

  private evaluateQuality(
    testCase: TestCase,
    detectedThemes: string[],
    mappedConcepts: string[],
    searchResults: any[],
    interpretiveHints: string[]
  ): TestResult['qualityMetrics'] {
    // Theme detection accuracy
    const expectedThemesSet = new Set(testCase.expectedThemes);
    const detectedThemesSet = new Set(detectedThemes);
    const themeMatches = testCase.expectedThemes.filter(t => detectedThemesSet.has(t)).length;
    const themeDetectionAccuracy = testCase.expectedThemes.length > 0 
      ? (themeMatches / testCase.expectedThemes.length) * 100
      : (detectedThemes.length === 0 ? 100 : 0);
    
    // Concept mapping accuracy
    const expectedConceptsSet = new Set(testCase.expectedConcepts);
    const mappedConceptsSet = new Set(mappedConcepts);
    const conceptMatches = testCase.expectedConcepts.filter(c => mappedConceptsSet.has(c)).length;
    const conceptMappingAccuracy = testCase.expectedConcepts.length > 0
      ? (conceptMatches / testCase.expectedConcepts.length) * 100
      : 50; // Neutral if no expected concepts
    
    // Content relevance score
    let contentRelevanceScore = 0;
    const topContent = searchResults.slice(0, 3).map(r => r.content.toLowerCase()).join(' ');
    
    // Check for quality indicators in retrieved content
    if (testCase.qualityIndicators.shouldMentionTerms) {
      const mentionedTerms = testCase.qualityIndicators.shouldMentionTerms.filter(term => 
        topContent.includes(term.toLowerCase())
      );
      contentRelevanceScore += (mentionedTerms.length / testCase.qualityIndicators.shouldMentionTerms.length) * 40;
    }
    
    if (testCase.qualityIndicators.shouldAddressTopics) {
      const addressedTopics = testCase.qualityIndicators.shouldAddressTopics.filter(topic => {
        const topicWords = topic.toLowerCase().split(' ');
        return topicWords.some(word => topContent.includes(word));
      });
      contentRelevanceScore += (addressedTopics.length / testCase.qualityIndicators.shouldAddressTopics.length) * 30;
    }
    
    // Archetype alignment
    let archetypeAlignment = 0;
    if (testCase.qualityIndicators.shouldRelateToArchetypes) {
      const mentionedArchetypes = testCase.qualityIndicators.shouldRelateToArchetypes.filter(arch => 
        topContent.includes(arch.toLowerCase())
      );
      archetypeAlignment = (mentionedArchetypes.length / testCase.qualityIndicators.shouldRelateToArchetypes.length) * 100;
    }
    
    // Interpretive value (composite score)
    const hasThemeBoost = searchResults.some(r => r.scores.themeBoost && r.scores.themeBoost > 0);
    const avgHybridScore = searchResults.slice(0, 3).reduce((sum, r) => sum + r.scores.hybrid, 0) / 3;
    
    const interpretiveValue = (
      themeDetectionAccuracy * 0.2 +
      conceptMappingAccuracy * 0.2 +
      contentRelevanceScore * 0.3 +
      archetypeAlignment * 0.2 +
      (avgHybridScore > 0.4 ? 10 : avgHybridScore * 25)
    );
    
    return {
      themeDetectionAccuracy,
      conceptMappingAccuracy,
      contentRelevanceScore,
      archetypeAlignment,
      interpretiveValue: Math.min(100, interpretiveValue)
    };
  }

  private analyzeQuality(
    testCase: TestCase,
    searchResults: any[],
    metrics: TestResult['qualityMetrics']
  ): string {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    // Analyze theme detection
    if (metrics.themeDetectionAccuracy >= 80) {
      strengths.push('Excellent theme detection');
    } else if (metrics.themeDetectionAccuracy < 50) {
      weaknesses.push('Poor theme detection');
    }
    
    // Analyze concept mapping
    if (metrics.conceptMappingAccuracy >= 80) {
      strengths.push('Accurate Jungian concept mapping');
    } else if (metrics.conceptMappingAccuracy < 50) {
      weaknesses.push('Weak concept mapping');
    }
    
    // Analyze content relevance
    if (metrics.contentRelevanceScore >= 70) {
      strengths.push('Highly relevant content retrieved');
    } else if (metrics.contentRelevanceScore < 30) {
      weaknesses.push('Retrieved content lacks relevance');
    }
    
    // Analyze archetype alignment
    if (metrics.archetypeAlignment >= 70) {
      strengths.push('Strong archetypal connections');
    } else if (metrics.archetypeAlignment < 30) {
      weaknesses.push('Missing archetypal depth');
    }
    
    // Check for theme boosting
    const hasThemeBoost = searchResults.some(r => r.scores.themeBoost && r.scores.themeBoost > 0);
    if (hasThemeBoost) {
      strengths.push('Theme-based boosting active');
    }
    
    // Overall assessment
    let overall = '';
    if (metrics.interpretiveValue >= 80) {
      overall = 'Excellent interpretive quality';
    } else if (metrics.interpretiveValue >= 60) {
      overall = 'Good interpretive quality';
    } else if (metrics.interpretiveValue >= 40) {
      overall = 'Moderate interpretive quality';
    } else {
      overall = 'Poor interpretive quality';
    }
    
    return `${overall}. Strengths: ${strengths.join(', ') || 'None identified'}. Weaknesses: ${weaknesses.join(', ') || 'None identified'}.`;
  }

  private generateQualityReport(results: TestResult[], duration: number): {
    summary: any;
    markdown: string;
  } {
    // Calculate aggregate metrics
    const avgMetrics = {
      themeDetection: results.reduce((sum, r) => sum + r.qualityMetrics.themeDetectionAccuracy, 0) / results.length,
      conceptMapping: results.reduce((sum, r) => sum + r.qualityMetrics.conceptMappingAccuracy, 0) / results.length,
      contentRelevance: results.reduce((sum, r) => sum + r.qualityMetrics.contentRelevanceScore, 0) / results.length,
      archetypeAlignment: results.reduce((sum, r) => sum + r.qualityMetrics.archetypeAlignment, 0) / results.length,
      interpretiveValue: results.reduce((sum, r) => sum + r.qualityMetrics.interpretiveValue, 0) / results.length
    };
    
    // Group by category
    const byCategory = new Map<string, TestResult[]>();
    results.forEach(r => {
      if (!byCategory.has(r.category)) {
        byCategory.set(r.category, []);
      }
      byCategory.get(r.category)!.push(r);
    });
    
    // Find best and worst performing
    const sortedByQuality = [...results].sort((a, b) => 
      b.qualityMetrics.interpretiveValue - a.qualityMetrics.interpretiveValue
    );
    
    const summary = {
      totalTests: results.length,
      duration: duration,
      averageMetrics: avgMetrics,
      categoryPerformance: Array.from(byCategory.entries()).map(([cat, catResults]) => ({
        category: cat,
        avgScore: catResults.reduce((sum, r) => sum + r.qualityMetrics.interpretiveValue, 0) / catResults.length,
        testCount: catResults.length
      })),
      topPerformers: sortedByQuality.slice(0, 3).map(r => ({
        id: r.testId,
        category: r.category,
        score: r.qualityMetrics.interpretiveValue
      })),
      bottomPerformers: sortedByQuality.slice(-3).map(r => ({
        id: r.testId,
        category: r.category,
        score: r.qualityMetrics.interpretiveValue
      }))
    };
    
    // Generate markdown report
    const markdown = `# Theme-Based Hybrid RAG Quality Report

Generated: ${new Date().toISOString()}
Duration: ${(duration / 1000).toFixed(2)} seconds

## Executive Summary

- **Total Tests**: ${summary.totalTests}
- **Overall Quality Score**: ${avgMetrics.interpretiveValue.toFixed(1)}/100
- **Theme Detection Accuracy**: ${avgMetrics.themeDetection.toFixed(1)}%
- **Concept Mapping Accuracy**: ${avgMetrics.conceptMapping.toFixed(1)}%
- **Content Relevance**: ${avgMetrics.contentRelevance.toFixed(1)}/100
- **Archetype Alignment**: ${avgMetrics.archetypeAlignment.toFixed(1)}%

## Category Performance

| Category | Average Score | Tests |
|----------|--------------|-------|
${summary.categoryPerformance
  .sort((a, b) => b.avgScore - a.avgScore)
  .map(cat => `| ${cat.category} | ${cat.avgScore.toFixed(1)}/100 | ${cat.testCount} |`)
  .join('\n')}

## Top Performers

${summary.topPerformers.map((p, i) => 
  `${i + 1}. **${p.id}** (${p.category}): ${p.score.toFixed(1)}/100`
).join('\n')}

## Areas for Improvement

${summary.bottomPerformers.map((p, i) => 
  `${i + 1}. **${p.id}** (${p.category}): ${p.score.toFixed(1)}/100`
).join('\n')}

## Detailed Results

${results.map(r => `
### Test ${r.testId}: ${r.category}

**Dream**: "${r.dream.substring(0, 150)}..."

**Detected Themes**: ${r.detectedThemes.join(', ') || 'None'}
**Mapped Concepts**: ${r.mappedConcepts.join(', ') || 'None'}

**Quality Metrics**:
- Theme Detection: ${r.qualityMetrics.themeDetectionAccuracy.toFixed(1)}%
- Concept Mapping: ${r.qualityMetrics.conceptMappingAccuracy.toFixed(1)}%
- Content Relevance: ${r.qualityMetrics.contentRelevanceScore.toFixed(1)}/100
- Archetype Alignment: ${r.qualityMetrics.archetypeAlignment.toFixed(1)}%
- **Overall Quality**: ${r.qualityMetrics.interpretiveValue.toFixed(1)}/100

**Analysis**: ${r.qualityAnalysis}

**Top Retrieved Content**:
${r.topResults.slice(0, 2).map((res, i) => 
  `${i + 1}. Score: ${res.scores.hybrid.toFixed(3)} | "${res.content}"`
).join('\n')}
`).join('\n---\n')}

## Recommendations

1. **Theme Detection**: ${avgMetrics.themeDetection < 70 ? 'Consider expanding theme keyword mappings' : 'Theme detection is performing well'}
2. **Content Relevance**: ${avgMetrics.contentRelevance < 60 ? 'Retrieved content may need better semantic alignment' : 'Content retrieval is effective'}
3. **Archetype Coverage**: ${avgMetrics.archetypeAlignment < 60 ? 'Ensure knowledge base includes archetypal references' : 'Good archetypal depth in results'}
4. **Modern Themes**: ${byCategory.get('Modern Technology') ? 
  `Modern tech dreams scored ${(byCategory.get('Modern Technology')!.reduce((s, r) => s + r.qualityMetrics.interpretiveValue, 0) / byCategory.get('Modern Technology')!.length).toFixed(1)}/100` : 
  'No modern tech dreams tested'}
`;

    return { summary, markdown };
  }
}

// Run the tests
async function main() {
  const tester = new ThemeHybridQualityTester();
  await tester.runQualityTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ThemeHybridQualityTester };
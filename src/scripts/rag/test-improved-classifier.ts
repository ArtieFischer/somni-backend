#!/usr/bin/env node
import { improvedKnowledgeClassifier } from './core/knowledge-classifier-bge-improved';
import { logger } from '../../utils/logger';

async function testImprovedClassifier() {
  logger.info('🧪 Testing improved BGE classifier...\n');

  const testCases = [
    {
      name: 'Theoretical Methodology Text',
      content: `It may be objected that all empirical reality is against this theory, since the impression of incoherence and obscurity that dreams make upon us is notorious. Freud calls this sequence of confused images the manifest content of the dream, in contradistinction to its latent content, which is logical, clear, and full of meaning. The method of dream analysis involves several key steps. First, the dreamer recounts the dream in detail.`,
      expectedType: 'methodology',
      shouldHaveMinimalThemes: true
    },
    {
      name: 'Actual Dream Content',
      content: `I dreamed I was walking along a beautiful beach at sunset. The waves were gently lapping at my feet, and I felt peaceful. Suddenly, I found myself in a dark maze with high walls. I was running, trying to find the exit, but every path led to a dead end. Behind me, I could hear something with a long tail chasing me. I woke up just before it caught me.`,
      expectedType: 'dream_example',
      expectedThemes: ['beach', 'maze', 'being_chased', 'tail']
    },
    {
      name: 'Jung Theory',
      content: `The theory of the collective unconscious represents one of Jung's most significant contributions to psychology. This theoretical framework suggests that beneath the personal unconscious lies a deeper stratum of the psyche that is universal and inherited. The collective unconscious contains archetypes - primordial images and patterns that manifest across all cultures.`,
      expectedType: 'theory',
      shouldHaveMinimalThemes: true
    },
    {
      name: 'Case Study',
      content: `A patient, a 35-year-old woman, came to analysis complaining of recurring nightmares about being chased through dark corridors. In our sessions, we discovered that these dreams began after a difficult divorce. The patient reported feeling trapped and unable to escape her past. Through analysis, we found that the pursuing figure represented her own shadow.`,
      expectedType: 'case_study',
      expectedThemes: ['being_chased', 'trapped', 'shadow']
    }
  ];

  let theoreticalTestsPassed = 0;
  let dreamTestsPassed = 0;

  for (const testCase of testCases) {
    logger.info(`\n📝 Test: ${testCase.name}`);
    logger.info(`Content: "${testCase.content.substring(0, 150)}..."`);
    
    try {
      const result = await improvedKnowledgeClassifier.classifyContent(testCase.content, 'jung');
      
      // Check content type
      const typeCorrect = result.primary_type === testCase.expectedType;
      logger.info(`🎯 Content Type: ${result.primary_type} ${typeCorrect ? '✅' : '❌'} (expected: ${testCase.expectedType})`);
      
      // Check themes
      const themes = result.applicable_themes || [];
      logger.info(`🏷️  Themes (${themes.length}): ${themes.length > 0 ? themes.join(', ') : 'none'}`);
      logger.info(`📊 Theme Confidence: ${result.theme_confidence?.toFixed(2) || 0}`);
      
      // Check if this should have minimal themes (theoretical content)
      if (testCase.shouldHaveMinimalThemes) {
        const hasMinimalThemes = themes.length <= 2;
        logger.info(`🧠 Minimal Themes Check: ${hasMinimalThemes ? '✅' : '❌'} (has ${themes.length} themes, should be ≤2)`);
        
        if (typeCorrect && hasMinimalThemes) {
          theoreticalTestsPassed++;
        }
      } else {
        // Check if expected themes are present
        let themeMatchCount = 0;
        if (testCase.expectedThemes) {
          for (const expectedTheme of testCase.expectedThemes) {
            if (themes.includes(expectedTheme)) {
              themeMatchCount++;
            }
          }
          const themeAccuracy = themeMatchCount / testCase.expectedThemes.length;
          logger.info(`🎯 Theme Matches: ${themeMatchCount}/${testCase.expectedThemes.length} (${(themeAccuracy * 100).toFixed(0)}%)`);
        }
        
        if (typeCorrect && themeMatchCount > 0) {
          dreamTestsPassed++;
        }
      }
      
      // Additional debug info
      logger.info(`🔍 Symbols: ${result.symbols_present?.join(', ') || 'none'}`);
      logger.info(`🧭 Concepts: ${result.jungian_concepts?.join(', ') || 'none'}`);
      
    } catch (error) {
      logger.error(`❌ Error in test:`, error);
    }
  }

  logger.info(`\n\n📊 Results Summary:`);
  logger.info(`🧠 Theoretical Content Tests: ${theoreticalTestsPassed}/2 passed`);
  logger.info(`💭 Dream Content Tests: ${dreamTestsPassed}/2 passed`);
  
  const totalPassed = theoreticalTestsPassed + dreamTestsPassed;
  const totalTests = 4;
  logger.info(`🎯 Overall: ${totalPassed}/${totalTests} (${((totalPassed/totalTests) * 100).toFixed(0)}%)`);
  
  if (totalPassed === totalTests) {
    logger.info(`\n✅ All tests passed! Ready for full ingestion.`);
  } else {
    logger.info(`\n⚠️  Some tests failed. Review classifier logic before full ingestion.`);
  }
}

if (require.main === module) {
  testImprovedClassifier()
    .then(() => {
      logger.info('\n🏁 Test complete!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}
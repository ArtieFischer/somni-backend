#!/usr/bin/env node
import { knowledgeClassifierFixed } from './core/knowledge-classifier-bge-fixed';
import { logger } from '../../utils/logger';

async function testBGEFixes() {
  logger.info('🧪 Testing BGE-M3 fixes...\n');

  const testCases = [
    {
      name: 'Dream Example',
      content: `I had a vivid dream last night. I was flying over a vast ocean, feeling both exhilarated and terrified. 
                Below me, I could see my childhood home getting smaller and smaller. Suddenly, I realized I was naked 
                and began to fall rapidly toward the water. I woke up just before hitting the surface.`,
      expectedType: 'dream_example',
      expectedThemes: ['flying', 'falling', 'naked', 'water']
    },
    {
      name: 'Jung Theory',
      content: `The theory of the collective unconscious represents one of Jung's most significant contributions to psychology. 
                This theoretical framework suggests that beneath the personal unconscious lies a deeper stratum of the psyche 
                that is universal and inherited. The collective unconscious contains archetypes - primordial images and patterns 
                that manifest across all cultures and throughout history.`,
      expectedType: 'theory',
      expectedThemes: []  // Theory passages may not have dream themes
    },
    {
      name: 'Symbol Analysis',
      content: `The snake as a symbol represents transformation and renewal in many cultures. In dreams, the serpent often 
                signifies the process of psychological rebirth. When a dreamer encounters a snake, it may indicate that 
                unconscious contents are ready to emerge into consciousness. The snake's ability to shed its skin symbolizes 
                the psyche's capacity for renewal and transformation.`,
      expectedType: 'symbol',
      expectedThemes: ['snake', 'transformation']
    },
    {
      name: 'Case Study',
      content: `A patient, a 35-year-old woman, came to analysis complaining of recurring nightmares about being chased 
                through dark corridors. In our sessions, we discovered that these dreams began after a difficult divorce. 
                The analysis revealed that the pursuing figure represented her own shadow - the parts of herself she had 
                rejected during her marriage. Through active imagination work, she was able to confront and integrate 
                these shadow aspects.`,
      expectedType: 'case_study',
      expectedThemes: ['being_chased', 'shadow', 'darkness']
    },
    {
      name: 'Methodology',
      content: `The method of dream analysis involves several key steps. First, the dreamer recounts the dream in detail. 
                Second, we explore personal associations to each dream element. This process of amplification helps reveal 
                the dream's personal significance. The technique requires patience and an open, non-judgmental approach. 
                The analyst must resist the temptation to impose interpretations and instead guide the dreamer toward 
                their own understanding.`,
      expectedType: 'methodology',
      expectedThemes: []
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    logger.info(`\n📝 Test Case: ${testCase.name}`);
    logger.info(`Content: "${testCase.content.substring(0, 100)}..."`);
    
    try {
      const result = await knowledgeClassifierFixed.classifyContent(testCase.content, 'jung');
      
      // Check content type
      const typeCorrect = result.primary_type === testCase.expectedType;
      logger.info(`\n✓ Content Type: ${result.primary_type} ${typeCorrect ? '✅' : '❌'} (expected: ${testCase.expectedType})`);
      
      // Check themes
      const themes = result.applicable_themes || [];
      logger.info(`✓ Themes: ${themes.length > 0 ? themes.join(', ') : 'none'}`);
      
      // Check if expected themes are present
      let themeMatchCount = 0;
      if (testCase.expectedThemes.length > 0) {
        for (const expectedTheme of testCase.expectedThemes) {
          if (themes.includes(expectedTheme)) {
            themeMatchCount++;
          }
        }
        const themeAccuracy = themeMatchCount / testCase.expectedThemes.length;
        logger.info(`✓ Theme Match: ${themeMatchCount}/${testCase.expectedThemes.length} (${(themeAccuracy * 100).toFixed(0)}%)`);
      }
      
      // Additional info
      logger.info(`✓ Confidence: ${JSON.stringify(result.confidence)}`);
      logger.info(`✓ Symbols: ${result.symbols_present?.join(', ') || 'none'}`);
      logger.info(`✓ Concepts: ${result.jungian_concepts?.join(', ') || 'none'}`);
      
      if (typeCorrect) {
        passed++;
        logger.info(`\n✅ PASSED`);
      } else {
        failed++;
        logger.info(`\n❌ FAILED`);
      }
      
    } catch (error) {
      logger.error(`❌ Error in test case:`, error);
      failed++;
    }
  }

  logger.info(`\n\n📊 Test Results:`);
  logger.info(`✅ Passed: ${passed}/${testCases.length}`);
  logger.info(`❌ Failed: ${failed}/${testCases.length}`);
  logger.info(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(0)}%`);
}

// Run if called directly
if (require.main === module) {
  testBGEFixes()
    .then(() => {
      logger.info('\n✅ Test complete!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}
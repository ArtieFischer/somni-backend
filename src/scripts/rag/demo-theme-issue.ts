#!/usr/bin/env node
import { knowledgeClassifier } from './core/knowledge-classifier-bge';
import { logger } from '../../utils/logger';

async function demonstrateThemeIssue() {
  logger.info('🔍 Demonstrating theme assignment issue...\n');

  // Sample text from your test output - this is about Jung's theoretical methodology
  const theoreticalText = `
    It may be objected that all empirical reality is against this theory, since the impression 
    of incoherence and obscurity that dreams make upon us is notorious. Freud calls this sequence 
    of confused images the manifest content of the dream, in contradistinction to its latent content, 
    which is logical, clear, and full of meaning.
  `;

  logger.info('📄 Analyzing theoretical text about Jung\'s dream analysis methodology...');
  logger.info(`Text: "${theoreticalText.trim().substring(0, 200)}..."`);
  
  try {
    const result = await knowledgeClassifier.classifyContent(theoreticalText, 'jung');
    
    logger.info('\n🎯 Current BGE Classifier Results:');
    logger.info(`Content Type: ${result.primary_type}`);
    logger.info(`Themes: ${result.applicable_themes?.join(', ') || 'none'}`);
    logger.info(`Confidence: ${JSON.stringify(result.confidence)}`);
    
    logger.info('\n❌ Problem Analysis:');
    logger.info('This text is about THEORETICAL concepts in dream analysis.');
    logger.info('It should NOT get themes like "beach", "maze", "track", "body", "pain", etc.');
    logger.info('Those themes are for actual DREAM CONTENT, not theoretical discussions.');
    
    logger.info('\n✅ Expected Results:');
    logger.info('- Content Type: theory or methodology');
    logger.info('- Themes: none (or very few relevant psychological themes)');
    logger.info('- High confidence for content type, low for irrelevant themes');
    
  } catch (error) {
    logger.error('Error:', error);
  }
}

// Test with a dream content example too
async function demonstrateDreamExample() {
  const dreamText = `
    I dreamed I was walking along a beautiful beach at sunset. The waves were gently lapping 
    at my feet, and I felt peaceful. Suddenly, I found myself in a dark maze with high walls. 
    I was running, trying to find the exit, but every path led to a dead end. Behind me, 
    I could hear something with a long tail chasing me.
  `;

  logger.info('\n\n📄 Analyzing actual dream content...');
  logger.info(`Text: "${dreamText.trim().substring(0, 200)}..."`);
  
  try {
    const result = await knowledgeClassifier.classifyContent(dreamText, 'jung');
    
    logger.info('\n🎯 Results for Dream Content:');
    logger.info(`Content Type: ${result.primary_type}`);
    logger.info(`Themes: ${result.applicable_themes?.join(', ') || 'none'}`);
    
    logger.info('\n✅ This Should Get:');
    logger.info('- Content Type: dream_example');
    logger.info('- Themes: beach, maze, being_chased, tail (because these are ACTUAL dream elements)');
    
  } catch (error) {
    logger.error('Error:', error);
  }
}

if (require.main === module) {
  demonstrateThemeIssue()
    .then(() => demonstrateDreamExample())
    .then(() => {
      logger.info('\n🔧 The fix uses semantic similarity instead of keyword matching');
      logger.info('💡 Run the database migration and theme embedding generation to apply the fix');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Error:', error);
      process.exit(1);
    });
}
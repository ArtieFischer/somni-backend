/**
 * Simple debug script to analyze JSON structure in symbolic_analysis stage
 */

const fs = require('fs');
const path = require('path');

// Read the prompt-builder.ts file
const promptBuilderPath = path.join(__dirname, 'src/dream-interpretation/services/prompt-builder.ts');
const promptBuilderContent = fs.readFileSync(promptBuilderPath, 'utf8');

// Extract the JSON structure from the symbolic_analysis stage
console.log('=== ANALYZING SYMBOLIC ANALYSIS JSON STRUCTURE ===\n');

// Find the start of the symbolic_analysis stage
const symbolicAnalysisStart = promptBuilderContent.indexOf('// Stage 1: Deep Symbolic Analysis');
const symbolicAnalysisEnd = promptBuilderContent.indexOf('// Stage 2: Knowledge Integration', symbolicAnalysisStart);

if (symbolicAnalysisStart === -1 || symbolicAnalysisEnd === -1) {
  console.error('Could not find symbolic_analysis stage in prompt-builder.ts');
  process.exit(1);
}

const symbolicAnalysisStage = promptBuilderContent.substring(symbolicAnalysisStart, symbolicAnalysisEnd);

console.log('Found symbolic_analysis stage content:\n');

// Extract the JSON structure from the stage
const jsonStartRegex = /Provide your analysis in JSON format:\s*\{/;
const jsonMatch = symbolicAnalysisStage.match(jsonStartRegex);

if (!jsonMatch) {
  console.error('Could not find JSON structure in symbolic_analysis stage');
  console.log('Stage content preview:', symbolicAnalysisStage.substring(0, 500) + '...');
  process.exit(1);
}

const jsonStartIndex = symbolicAnalysisStage.indexOf(jsonMatch[0]);
const jsonEndIndex = symbolicAnalysisStage.indexOf('}`', jsonStartIndex) + 1;

if (jsonEndIndex === 0) {
  console.error('Could not find end of JSON structure');
  process.exit(1);
}

const jsonStructure = symbolicAnalysisStage.substring(jsonStartIndex, jsonEndIndex);

console.log('Extracted JSON structure:');
console.log('========================');
console.log(jsonStructure);
console.log('========================\n');

// Try to parse the JSON to check for syntax errors
const jsonContent = jsonStructure.replace(/Provide your analysis in JSON format:\s*/, '');

console.log('Attempting to parse JSON...');
try {
  const parsed = JSON.parse(jsonContent);
  console.log('✅ JSON structure is valid!');
  console.log('Parsed structure:', JSON.stringify(parsed, null, 2));
} catch (error) {
  console.log('❌ JSON structure has syntax errors:');
  console.log('Error:', error.message);
  console.log('\nProblematic JSON:');
  console.log(jsonContent);
  
  // Try to identify common issues
  console.log('\n=== ANALYSIS ===');
  
  // Check for unescaped quotes
  const unescapedQuotes = jsonContent.match(/[^\\]"/g);
  if (unescapedQuotes) {
    console.log('⚠️  Potential unescaped quotes found');
  }
  
  // Check for comments
  const comments = jsonContent.match(/\/\/.*$/gm);
  if (comments) {
    console.log('⚠️  Comments found in JSON (not allowed):', comments);
  }
  
  // Check for trailing commas
  const trailingCommas = jsonContent.match(/,\s*[}\]]/g);
  if (trailingCommas) {
    console.log('⚠️  Trailing commas found:', trailingCommas);
  }
  
  // Check for single quotes
  const singleQuotes = jsonContent.match(/'/g);
  if (singleQuotes) {
    console.log('⚠️  Single quotes found (use double quotes)');
  }
}

console.log('\n=== POTENTIAL ISSUES ===');

// Check for dynamic content that might cause issues
const dynamicContent = [
  'Main archetype present',
  'Other archetypes',
  'How they appear in the dream',
  'Shadow aspects',
  'What they reveal',
  'Guidance for shadow work'
];

dynamicContent.forEach(content => {
  if (jsonContent.includes(content)) {
    console.log(`⚠️  Found placeholder text: "${content}"`);
    console.log('   This should be replaced with actual values by the LLM');
  }
});

console.log('\n=== RECOMMENDATIONS ===');
console.log('1. The JSON structure appears to be a template for the LLM to fill out');
console.log('2. JSON parsing errors likely occur when:');
console.log('   - LLM returns incomplete JSON');
console.log('   - LLM includes explanatory text before/after JSON');
console.log('   - LLM uses single quotes instead of double quotes');
console.log('   - LLM includes comments or trailing commas');
console.log('3. Consider adding JSON validation instructions to the prompt');
console.log('4. Consider implementing better JSON extraction from LLM responses');
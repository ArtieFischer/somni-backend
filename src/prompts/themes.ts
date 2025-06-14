/**
 * Universal themes and symbols that apply across all interpretation methods
 * This collection grows over time and helps build user's dream map
 */
export interface UniversalTheme {
  name: string;
  category: 'character' | 'object' | 'setting' | 'action' | 'emotion' | 'symbol';
  commonMeanings: string[];
  keywords: string[];
}

/**
 * Universal themes database - interpreter-agnostic
 * These will be detected in dreams regardless of chosen interpreter
 */
export const UNIVERSAL_THEMES: UniversalTheme[] = [
  // Characters
  {
    name: 'Shadow Figure',
    category: 'character',
    commonMeanings: ['Unknown aspects of self', 'Repressed qualities', 'Fear of unknown'],
    keywords: ['dark figure', 'stranger', 'chasing', 'mysterious person', 'hooded', 'faceless']
  },
  {
    name: 'Wise Guide',
    category: 'character', 
    commonMeanings: ['Inner wisdom', 'Guidance needed', 'Mentor archetype'],
    keywords: ['old man', 'wise woman', 'teacher', 'guru', 'elder', 'guide']
  },
  
  // Settings
  {
    name: 'Water Bodies',
    category: 'setting',
    commonMeanings: ['Unconscious mind', 'Emotions', 'Life flow', 'Purification'],
    keywords: ['ocean', 'river', 'lake', 'pool', 'rain', 'flood', 'waves']
  },
  {
    name: 'Heights',
    category: 'setting',
    commonMeanings: ['Perspective', 'Achievement', 'Fear of falling', 'Spiritual elevation'],
    keywords: ['mountain', 'building', 'cliff', 'tower', 'airplane', 'rooftop']
  },
  
  // Actions
  {
    name: 'Flying',
    category: 'action',
    commonMeanings: ['Freedom', 'Transcendence', 'Escape', 'Spiritual journey'],
    keywords: ['flying', 'floating', 'soaring', 'levitating', 'wings']
  },
  {
    name: 'Being Chased',
    category: 'action', 
    commonMeanings: ['Avoiding something', 'Fear', 'Running from responsibility'],
    keywords: ['chased', 'running', 'escaping', 'pursued', 'hunted']
  },
  
  // Objects
  {
    name: 'Vehicles',
    category: 'object',
    commonMeanings: ['Life direction', 'Control', 'Journey', 'Progress'],
    keywords: ['car', 'train', 'boat', 'airplane', 'bicycle', 'bus']
  },
  {
    name: 'Houses',
    category: 'object',
    commonMeanings: ['Self', 'Psyche structure', 'Security', 'Inner world'],
    keywords: ['house', 'home', 'building', 'room', 'basement', 'attic']
  }
]; 
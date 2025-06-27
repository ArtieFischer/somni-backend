/**
 * Quick setup script to create test data for conversational AI testing
 */
import { supabaseService } from '../services/supabase';
import * as bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

async function createTestData() {
  console.log('🔧 Creating test data for conversational AI...\n');

  try {
    // 1. Create test user
    const testEmail = 'conversational-test@example.com';
    const testPassword = 'test123456';
    
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const { data: existingUser } = await supabaseService.getClient()
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .single();

    let userId: string;
    
    if (existingUser) {
      userId = existingUser.id;
      console.log('✓ Test user already exists:', userId);
    } else {
      const { data: newUser, error: userError } = await supabaseService.getClient()
        .from('users')
        .insert({
          email: testEmail,
          password: hashedPassword,
          name: 'Conversational Test User'
        })
        .select()
        .single();

      if (userError) throw userError;
      userId = newUser.id;
      console.log('✓ Test user created:', userId);
    }

    // 2. Create test dream
    console.log('\nCreating test dream...');
    const dreamContent = `I was in a vast library with towering shelves that seemed to reach the sky. 
    Books were flying around like birds, and I could hear them whispering secrets. 
    I found an ancient book with my name on it, and when I opened it, golden light poured out. 
    Inside, I saw my reflection, but it was older and wiser. 
    The reflection smiled at me and said, "The answers you seek are already within you."`;

    const { data: dream, error: dreamError } = await supabaseService.getClient()
      .from('dreams')
      .insert({
        user_id: userId,
        transcription: dreamContent,
        title: 'The Library of Inner Wisdom',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dreamError) throw dreamError;
    console.log('✓ Test dream created:', dream.id);

    // 3. Create Jung interpretation
    console.log('\nCreating Jung interpretation...');
    const jungInterpretation = {
      dream_id: dream.id,
      user_id: userId,
      interpreter_type: 'jung',
      interpretation: 'This dream presents powerful archetypal imagery of the Self and the process of individuation.',
      quick_take: 'A profound dream about self-discovery and inner wisdom',
      symbols: ['library', 'flying books', 'ancient book', 'golden light', 'wise reflection'],
      themes: ['knowledge', 'wisdom', 'self-discovery', 'transformation'],
      emotions: ['curiosity', 'awe', 'recognition', 'peace'],
      emotional_tone: { primary: 'transcendent', intensity: 0.8 },
      questions: [
        'What knowledge are you currently seeking in your life?',
        'How do you relate to the idea of having wisdom within you?',
        'What might the golden light represent for you?'
      ],
      additional_insights: 'The library represents the collective unconscious...',
      interpretation_core: {
        type: 'jungian',
        primaryInsight: 'Journey toward Self-realization',
        archetypalDynamics: {
          primaryArchetype: 'The Self',
          supportingArchetypes: ['Wise Old Man/Woman'],
          compensatoryFunction: 'Balancing conscious seeking with inner knowing'
        }
      },
      created_at: new Date().toISOString()
    };

    const { data: interpretation, error: interpError } = await supabaseService.getClient()
      .from('interpretations')
      .insert(jungInterpretation)
      .select()
      .single();

    if (interpError) throw interpError;
    console.log('✓ Jung interpretation created');

    // 4. Output test credentials
    console.log('\n✅ Test data created successfully!\n');
    console.log('=== Test Credentials ===');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('Dream ID:', dream.id);
    console.log('User ID:', userId);
    console.log('\nUpdate these values in test-conversational-websocket.ts:');
    console.log(`const TEST_EMAIL = '${testEmail}';`);
    console.log(`const TEST_PASSWORD = '${testPassword}';`);
    console.log(`const TEST_DREAM_ID = '${dream.id}';`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the setup
createTestData();
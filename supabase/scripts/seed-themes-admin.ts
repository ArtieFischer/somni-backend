// Script to seed dream themes using service role key
// This needs to be run with admin privileges

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tqwlnrlvtdsqgqpuryne.supabase.co';
// IMPORTANT: Replace with your service role key - DO NOT commit this!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Common dream themes based on psychological research
const dreamThemes = [
  // Universal themes
  { code: 'falling', label: 'Falling', description: 'Dreams about falling, losing balance, or dropping from heights' },
  { code: 'flying', label: 'Flying', description: 'Dreams about flying, floating, or levitating' },
  { code: 'being_chased', label: 'Being Chased', description: 'Dreams about being pursued or running from danger' },
  { code: 'death', label: 'Death', description: 'Dreams about death, dying, or mortality' },
  { code: 'lost', label: 'Being Lost', description: 'Dreams about being lost, unable to find your way' },
  { code: 'escape', label: 'Escaping', description: 'Dreams about escaping from danger, confinement, or difficult situations' },
  { code: 'trapped', label: 'Being Trapped', description: 'Dreams about being trapped, confined, or unable to move' },
  { code: 'hiding', label: 'Hiding', description: 'Dreams about hiding from someone or something' },
  
  // Relationship themes
  { code: 'love', label: 'Love & Romance', description: 'Dreams about romantic relationships, love, or intimacy' },
  { code: 'family', label: 'Family', description: 'Dreams involving family members or family dynamics' },
  { code: 'friends', label: 'Friends', description: 'Dreams about friendships or social connections' },
  { code: 'betrayal', label: 'Betrayal', description: 'Dreams about being betrayed or betraying others' },
  { code: 'stranger', label: 'Strangers', description: 'Dreams involving unknown people or mysterious figures' },
  { code: 'ex_partner', label: 'Ex-Partners', description: 'Dreams about former romantic partners or past relationships' },
  { code: 'wedding', label: 'Wedding', description: 'Dreams about weddings, marriage ceremonies, or commitment' },
  { code: 'reunion', label: 'Reunion', description: 'Dreams about reuniting with people from the past' },
  { code: 'abandonment', label: 'Abandonment', description: 'Dreams about being abandoned or left behind' },
  
  // Achievement/Failure
  { code: 'success', label: 'Success', description: 'Dreams about achieving goals or succeeding' },
  { code: 'failure', label: 'Failure', description: 'Dreams about failing, making mistakes, or inadequacy' },
  { code: 'exam', label: 'Exams/Tests', description: 'Dreams about taking tests, being unprepared, or being evaluated' },
  { code: 'competition', label: 'Competition', description: 'Dreams about races, contests, or competing with others' },
  { code: 'performance', label: 'Performance', description: 'Dreams about performing on stage or in public' },
  { code: 'interview', label: 'Interview', description: 'Dreams about job interviews or being questioned' },
  
  // Body/Physical
  { code: 'naked', label: 'Being Naked', description: 'Dreams about being naked or inappropriately dressed in public' },
  { code: 'teeth', label: 'Teeth Falling Out', description: 'Dreams about losing teeth or dental problems' },
  { code: 'pregnancy', label: 'Pregnancy', description: 'Dreams about being pregnant or giving birth' },
  { code: 'illness', label: 'Illness', description: 'Dreams about being sick or diseased' },
  { code: 'injury', label: 'Injury', description: 'Dreams about being wounded, hurt, or physically damaged' },
  { code: 'hair', label: 'Hair', description: 'Dreams about hair loss, hair changes, or hair growth' },
  { code: 'body_parts', label: 'Body Parts', description: 'Dreams focusing on specific body parts or organs' },
  { code: 'paralysis', label: 'Paralysis', description: 'Dreams about being unable to move or speak' },
  { code: 'aging', label: 'Aging', description: 'Dreams about growing old or seeing oneself at different ages' },
  
  // Nature/Animals
  { code: 'water', label: 'Water', description: 'Dreams featuring water, oceans, rivers, or drowning' },
  { code: 'animals', label: 'Animals', description: 'Dreams featuring animals or creatures' },
  { code: 'natural_disaster', label: 'Natural Disasters', description: 'Dreams about earthquakes, tsunamis, storms' },
  { code: 'snake', label: 'Snakes', description: 'Dreams featuring snakes or serpents' },
  { code: 'spider', label: 'Spiders', description: 'Dreams about spiders or being caught in webs' },
  { code: 'dog', label: 'Dogs', description: 'Dreams featuring dogs, puppies, or canines' },
  { code: 'cat', label: 'Cats', description: 'Dreams featuring cats, kittens, or felines' },
  { code: 'bird', label: 'Birds', description: 'Dreams about birds, flying creatures, or wings' },
  { code: 'insect', label: 'Insects', description: 'Dreams about bugs, insects, or small creatures' },
  { code: 'ocean', label: 'Ocean', description: 'Dreams about the sea, waves, or vast waters' },
  { code: 'forest', label: 'Forest', description: 'Dreams about woods, trees, or getting lost in nature' },
  { code: 'mountain', label: 'Mountains', description: 'Dreams about climbing, mountains, or high places' },
  { code: 'fire', label: 'Fire', description: 'Dreams about fire, flames, or burning' },
  { code: 'storm', label: 'Storms', description: 'Dreams about thunderstorms, lightning, or severe weather' },
  
  // Supernatural/Spiritual
  { code: 'supernatural', label: 'Supernatural', description: 'Dreams about ghosts, spirits, or paranormal events' },
  { code: 'religious', label: 'Religious/Spiritual', description: 'Dreams with religious or spiritual themes' },
  { code: 'transformation', label: 'Transformation', description: 'Dreams about changing form or metamorphosis' },
  { code: 'demon', label: 'Demons', description: 'Dreams about demons, devils, or evil entities' },
  { code: 'angel', label: 'Angels', description: 'Dreams about angels, divine beings, or protectors' },
  { code: 'magic', label: 'Magic', description: 'Dreams about magical powers, spells, or supernatural abilities' },
  { code: 'afterlife', label: 'Afterlife', description: 'Dreams about heaven, hell, or life after death' },
  { code: 'god', label: 'Divine Beings', description: 'Dreams about gods, goddesses, or supreme beings' },
  { code: 'ritual', label: 'Rituals', description: 'Dreams about ceremonies, rituals, or sacred practices' },
  { code: 'vampire', label: 'Vampires', description: 'Dreams about vampires, blood-drinking, or immortal beings' },
  { code: 'witch', label: 'Witches', description: 'Dreams about witches, witchcraft, or sorcery' },
  
  // Travel/Journey
  { code: 'travel', label: 'Travel', description: 'Dreams about journeys, trips, or transportation' },
  { code: 'vehicle', label: 'Vehicles', description: 'Dreams about cars, planes, or other vehicles' },
  { code: 'late', label: 'Being Late', description: 'Dreams about running late or missing appointments' },
  { code: 'train', label: 'Trains', description: 'Dreams about trains, railways, or train stations' },
  { code: 'airplane', label: 'Airplanes', description: 'Dreams about flying in planes or airports' },
  { code: 'ship', label: 'Ships', description: 'Dreams about boats, ships, or sailing' },
  { code: 'car_accident', label: 'Car Accidents', description: 'Dreams about vehicle crashes or collisions' },
  { code: 'road', label: 'Roads', description: 'Dreams about paths, highways, or journeys' },
  { code: 'bridge', label: 'Bridges', description: 'Dreams about crossing bridges or transitions' },
  
  // Conflict/Violence
  { code: 'conflict', label: 'Conflict', description: 'Dreams about arguments, fights, or confrontations' },
  { code: 'war', label: 'War', description: 'Dreams about war, battle, or large-scale conflict' },
  { code: 'violence', label: 'Violence', description: 'Dreams involving violent acts or aggression' },
  { code: 'murder', label: 'Murder', description: 'Dreams about killing or being killed' },
  { code: 'weapon', label: 'Weapons', description: 'Dreams featuring guns, knives, or other weapons' },
  { code: 'invasion', label: 'Invasion', description: 'Dreams about being invaded or territory being violated' },
  { code: 'prison', label: 'Prison', description: 'Dreams about jail, confinement, or captivity' },
  { code: 'crime', label: 'Crime', description: 'Dreams about criminal acts or being a victim of crime' },
  
  // Home/Places
  { code: 'home', label: 'Home', description: 'Dreams about your home or childhood home' },
  { code: 'work', label: 'Work/School', description: 'Dreams about workplace or school environments' },
  { code: 'unfamiliar_place', label: 'Unfamiliar Places', description: 'Dreams about strange or unknown locations' },
  { code: 'basement', label: 'Basement', description: 'Dreams about basements, cellars, or underground spaces' },
  { code: 'attic', label: 'Attic', description: 'Dreams about attics, upper rooms, or hidden spaces' },
  { code: 'bathroom', label: 'Bathroom', description: 'Dreams about bathrooms, toilets, or privacy' },
  { code: 'hospital', label: 'Hospital', description: 'Dreams about hospitals, medical facilities, or healing' },
  { code: 'cemetery', label: 'Cemetery', description: 'Dreams about graveyards, tombstones, or burial grounds' },
  { code: 'church', label: 'Church/Temple', description: 'Dreams about religious buildings or sacred spaces' },
  { code: 'hotel', label: 'Hotel', description: 'Dreams about hotels, temporary lodging, or transient spaces' },
  { code: 'mall', label: 'Shopping Mall', description: 'Dreams about shopping centers or marketplaces' },
  { code: 'castle', label: 'Castle', description: 'Dreams about castles, fortresses, or grand buildings' },
  { code: 'maze', label: 'Maze/Labyrinth', description: 'Dreams about being lost in mazes or complex paths' },
  
  // Technology/Modern
  { code: 'technology', label: 'Technology', description: 'Dreams about computers, phones, or technology' },
  { code: 'social_media', label: 'Social Media', description: 'Dreams about social media or online interactions' },
  { code: 'phone', label: 'Phone', description: 'Dreams about phone calls, messages, or communication devices' },
  { code: 'computer', label: 'Computer', description: 'Dreams about computers, screens, or digital interfaces' },
  { code: 'robot', label: 'Robots', description: 'Dreams about robots, androids, or mechanical beings' },
  { code: 'ai', label: 'Artificial Intelligence', description: 'Dreams about AI, AGI, LLMs, chatbots,ChatGPT, or other AI-powered systems' },
  { code: 'vr', label: 'Virtual Reality', description: 'Dreams about VR, Oculus, Meta, or other VR-related experiences' },
  { code: 'space', label: 'Space', description: 'Dreams about space, rockets, moon, aliens, or outer space' },
  { code: 'cyberpunk', label: 'Cyberpunk', description: 'Dreams about cyberpunk, bioimplants, or futuristic cities' },
  
  // Emotions
  { code: 'anxiety', label: 'Anxiety', description: 'Dreams characterized by anxiety or worry' },
  { code: 'joy', label: 'Joy/Happiness', description: 'Dreams characterized by joy or happiness' },
  { code: 'fear', label: 'Fear', description: 'Dreams characterized by fear or terror' },
  { code: 'sadness', label: 'Sadness', description: 'Dreams characterized by sadness or grief' },
  { code: 'anger', label: 'Anger', description: 'Dreams characterized by rage, fury, or frustration' },
  { code: 'guilt', label: 'Guilt', description: 'Dreams characterized by guilt, shame, or regret' },
  { code: 'loneliness', label: 'Loneliness', description: 'Dreams characterized by isolation or being alone' },
  
  // Objects/Items
  { code: 'money', label: 'Money', description: 'Dreams about wealth, coins, bills, or financial matters' },
  { code: 'key', label: 'Keys', description: 'Dreams about keys, locks, or access' },
  { code: 'mirror', label: 'Mirrors', description: 'Dreams about reflections, mirrors, or self-image' },
  { code: 'door', label: 'Doors', description: 'Dreams about doors, entrances, or passages' },
  { code: 'box', label: 'Boxes', description: 'Dreams about containers, packages, or hidden contents' },
  { code: 'book', label: 'Books', description: 'Dreams about reading, books, or knowledge' },
  { code: 'jewelry', label: 'Jewelry', description: 'Dreams about gems, rings, or precious items' },
  { code: 'food', label: 'Food', description: 'Dreams about eating, cooking, or food' },
  { code: 'clothes', label: 'Clothing', description: 'Dreams about clothes, dressing, or appearance' },
  { code: 'treasure', label: 'Treasure', description: 'Dreams about finding treasure or valuable items' },
  { code: 'letter', label: 'Letters/Messages', description: 'Dreams about receiving mail or important messages' },
  { code: 'gift', label: 'Gifts', description: 'Dreams about giving or receiving presents' },
  
  // People/Roles
  { code: 'baby', label: 'Babies', description: 'Dreams about infants, newborns, or new beginnings' },
  { code: 'child', label: 'Children', description: 'Dreams about children or childhood' },
  { code: 'elder', label: 'Elderly', description: 'Dreams about old people, wisdom, or aging' },
  { code: 'teacher', label: 'Teachers', description: 'Dreams about instructors, mentors, or authority figures' },
  { code: 'doctor', label: 'Doctors', description: 'Dreams about physicians, healers, or medical professionals' },
  { code: 'police', label: 'Police', description: 'Dreams about law enforcement or authority' },
  { code: 'celebrity', label: 'Celebrities', description: 'Dreams about famous people or public figures' },
  { code: 'twin', label: 'Twins', description: 'Dreams about doubles, twins, or doppelgangers' },
  
  // Time/Temporal
  { code: 'past', label: 'Past', description: 'Dreams about past events, memories, or nostalgia' },
  { code: 'future', label: 'Future', description: 'Dreams about future events or time travel' },
  { code: 'apocalypse', label: 'Apocalypse', description: 'Dreams about the end of the world or civilization' },
  { code: 'time_loop', label: 'Time Loop', description: 'Dreams about repeating events or being stuck in time' },
  
  // Lucid/Special
  { code: 'lucid', label: 'Lucid Dreaming', description: 'Dreams where you realize you are dreaming' },
  { code: 'recurring', label: 'Recurring', description: 'Dreams that repeat with similar themes or scenes' },
  { code: 'prophetic', label: 'Prophetic', description: 'Dreams that seem to predict future events' },
  { code: 'nightmare', label: 'Nightmares', description: 'Intensely frightening or disturbing dreams' },
  { code: 'sleep_paralysis', label: 'Sleep Paralysis', description: 'Dreams involving inability to move upon waking' },
  { code: 'false_awakening', label: 'False Awakening', description: 'Dreams about waking up while still dreaming' }
];

async function seedThemes() {
  console.log(`Seeding ${dreamThemes.length} themes with service role key...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const theme of dreamThemes) {
    const { error } = await supabase
      .from('themes')
      .upsert({
        code: theme.code,
        label: theme.label,
        description: theme.description
      }, { onConflict: 'code' });
    
    if (error) {
      console.error(`Failed to insert theme ${theme.code}:`, error);
      errorCount++;
    } else {
      console.log(`✓ Inserted theme: ${theme.code}`);
      successCount++;
    }
  }
  
  console.log(`\nSeeding complete: ${successCount} succeeded, ${errorCount} failed`);
  
  if (successCount > 0) {
    console.log('\nThemes inserted successfully! Now you can generate embeddings.');
    console.log('\nTo generate embeddings, make sure your backend is running and call:');
    console.log('POST https://somni-backend-production.up.railway.app/api/v1/embeddings/embed-themes');
    console.log('\nWith proper authentication headers.');
  }
}

// Run the seeding
seedThemes();
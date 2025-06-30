-- =====================================================================
-- SEED DATA MIGRATION
-- Initial data for themes and other reference tables
-- =====================================================================

-- =====================================================================
-- THEMES SEED DATA
-- Core dream themes with descriptions
-- =====================================================================

INSERT INTO themes (code, label, description) VALUES
-- Movement & Action
('falling', 'Falling', 'Dreams about falling, losing balance, or dropping from heights'),
('flying', 'Flying', 'Dreams about flying, floating, or levitating'),
('being_chased', 'Being Chased', 'Dreams about being pursued or running from danger'),
('escape', 'Escaping', 'Dreams about escaping from danger, confinement, or difficult situations'),
('trapped', 'Being Trapped', 'Dreams about being trapped, confined, or unable to move'),
('hiding', 'Hiding', 'Dreams about hiding from someone or something'),
('running', 'Running', 'Dreams about running, jogging, or racing'),
('climbing', 'Climbing', 'Dreams about climbing mountains, stairs, or ascending'),
('swimming', 'Swimming', 'Dreams about swimming, being in water, or diving'),
('driving', 'Driving', 'Dreams about driving vehicles or being driven'),

-- Life & Death
('death', 'Death', 'Dreams about death, dying, or mortality'),
('birth', 'Birth', 'Dreams about childbirth, new beginnings, or creation'),
('funeral', 'Funeral', 'Dreams about funerals, burials, or memorial services'),
('rebirth', 'Rebirth', 'Dreams about resurrection, renewal, or starting over'),
('afterlife', 'Afterlife', 'Dreams about heaven, hell, or life after death'),

-- Relationships
('love', 'Love & Romance', 'Dreams about romantic relationships, love, or intimacy'),
('family', 'Family', 'Dreams involving family members or family dynamics'),
('friends', 'Friends', 'Dreams about friendships or social connections'),
('betrayal', 'Betrayal', 'Dreams about being betrayed or betraying others'),
('stranger', 'Strangers', 'Dreams involving unknown people or mysterious figures'),
('ex_partner', 'Ex-Partners', 'Dreams about former romantic partners or past relationships'),
('wedding', 'Wedding', 'Dreams about weddings, marriage ceremonies, or commitment'),
('reunion', 'Reunion', 'Dreams about reuniting with people from the past'),
('abandonment', 'Abandonment', 'Dreams about being abandoned or left behind'),
('boyfriend', 'Boyfriend', 'Dreams about boyfriends, romantic desires, or relationship dynamics'),
('girlfriend', 'Girlfriend', 'Dreams about girlfriends, romantic partners, or dating relationships'),
('husband', 'Husband', 'Dreams about husbands, spouses, or marital relationships'),
('wife', 'Wife', 'Dreams about wives, married women, or spousal relationships'),
('kiss', 'Kiss', 'Dreams about kissing someone, being kissed, or romantic moments'),
('marriage', 'Marriage', 'Dreams about wedding ceremonies, marriage proposals, or married life'),

-- Emotions
('hate', 'Hate', 'Dreams involving hatred, intense dislike, or hostile feelings'),
('fear', 'Fear', 'Dreams dominated by fear, anxiety, or terror'),
('joy', 'Joy', 'Dreams filled with happiness, celebration, or euphoria'),
('sadness', 'Sadness', 'Dreams involving grief, sorrow, or melancholy'),
('anger', 'Anger', 'Dreams about rage, frustration, or confrontation'),
('guilt', 'Guilt', 'Dreams involving guilt, shame, or regret'),
('jealousy', 'Jealousy', 'Dreams about envy, resentment, or possessiveness'),

-- Achievement & Performance
('success', 'Success', 'Dreams about achieving goals or succeeding'),
('failure', 'Failure', 'Dreams about failing, making mistakes, or inadequacy'),
('exam', 'Exams/Tests', 'Dreams about taking tests, being unprepared, or being evaluated'),
('competition', 'Competition', 'Dreams about races, contests, or competing with others'),
('performance', 'Performance', 'Dreams about performing on stage or in public'),
('interview', 'Interview', 'Dreams about job interviews or being questioned'),
('victory', 'Victory', 'Dreams about winning, triumph, or celebrating success'),
('prize', 'Prize', 'Dreams about winning prizes, trophies, or competitions'),

-- Body & Health
('naked', 'Being Naked', 'Dreams about being naked or inappropriately dressed in public'),
('teeth', 'Teeth Falling Out', 'Dreams about losing teeth or dental problems'),
('pregnancy', 'Pregnancy', 'Dreams about being pregnant or giving birth'),
('illness', 'Illness', 'Dreams about being sick or diseased'),
('injury', 'Injury', 'Dreams about being wounded, hurt, or physically damaged'),
('hair', 'Hair', 'Dreams about hair loss, hair changes, or hair growth'),
('body_parts', 'Body Parts', 'Dreams focusing on specific body parts or organs'),
('paralysis', 'Paralysis', 'Dreams about being unable to move or speak'),
('aging', 'Aging', 'Dreams about growing old or seeing oneself at different ages'),
('blood', 'Blood', 'Dreams about blood, life force, family ties, or emotional wounds'),

-- Places & Locations
('home', 'Home', 'Dreams about houses, apartments, or childhood homes'),
('school', 'School', 'Dreams about schools, classrooms, or educational settings'),
('work', 'Work', 'Dreams about workplaces, offices, or professional settings'),
('lost', 'Being Lost', 'Dreams about being lost, unable to find your way'),
('travel', 'Travel', 'Dreams about journeys, trips, or exploring new places'),
('bridge', 'Bridge', 'Dreams about bridges, transitions, or connections'),
('elevator', 'Elevator', 'Dreams about elevators, lifts, or vertical movement'),
('hospital', 'Hospital', 'Dreams about hospitals, medical facilities, or healing'),
('prison', 'Prison', 'Dreams about jail, confinement, or restriction'),
('church', 'Church', 'Dreams about churches, temples, or sacred spaces'),
('cemetery', 'Cemetery', 'Dreams about graveyards, tombstones, or burial grounds'),
('city', 'City', 'Dreams about urban environments, buildings, or metropolises'),
('garden', 'Garden', 'Dreams about gardens, planting, cultivation, or growth'),
('island', 'Island', 'Dreams about isolation, escape, paradise, or being marooned'),
('labyrinth', 'Labyrinth', 'Dreams about complex paths, confusion, or searching for direction'),
('tower', 'Tower', 'Dreams about towers, heights, ambition, or isolation'),
('tunnel', 'Tunnel', 'Dreams about passages, transitions, or moving through darkness'),
('door', 'Door', 'Dreams about doors, opportunities, transitions, or boundaries'),
('castle', 'Castle', 'Dreams about castles, grandeur, protection, or fantasy'),
('forest', 'Forest', 'Dreams about woods, wilderness, the unknown, or natural settings'),

-- Nature & Elements
('water', 'Water', 'Dreams about oceans, lakes, rivers, or water in general'),
('fire', 'Fire', 'Dreams about flames, burning, or destruction'),
('storm', 'Storm', 'Dreams about storms, turbulence, or weather extremes'),
('earthquake', 'Earthquake', 'Dreams about earthquakes, instability, or ground shaking'),
('flood', 'Flood', 'Dreams about flooding, overwhelming emotions, or being submerged'),
('rain', 'Rain', 'Dreams about rain, cleansing, renewal, or sadness'),
('rainbow', 'Rainbow', 'Dreams about rainbows, hope, diversity, or promise'),
('tornado', 'Tornado', 'Dreams about tornadoes, chaos, destruction, or powerful change'),
('ocean', 'Ocean', 'Dreams about vast waters, the unconscious, or emotional depths'),
('river', 'River', 'Dreams about flowing water, life journey, or change'),
('mountain', 'Mountain', 'Dreams about mountains, challenges, achievements, or obstacles'),
('valley', 'Valley', 'Dreams about valleys, low points, shelter, or transitions'),

-- Animals & Creatures
('animals', 'Animals', 'Dreams featuring animals or creatures'),
('snake', 'Snake', 'Dreams about snakes, transformation, or hidden threats'),
('dog', 'Dog', 'Dreams about dogs, loyalty, or companionship'),
('cat', 'Cat', 'Dreams about cats, independence, or mystery'),
('bird', 'Bird', 'Dreams about birds, freedom, or messages'),
('spider', 'Spider', 'Dreams about spiders, webs, or feeling trapped'),
('monster', 'Monster', 'Dreams about monsters, fears, or unknown threats'),
('bear', 'Bear', 'Dreams about bears, strength, protection, or primal power'),
('butterfly', 'Butterfly', 'Dreams about transformation, beauty, or fleeting moments'),
('dragon', 'Dragon', 'Dreams about dragons, power, wisdom, or mythical forces'),
('eagle', 'Eagle', 'Dreams about eagles, vision, freedom, or high perspective'),
('elephant', 'Elephant', 'Dreams about elephants, memory, wisdom, or gentle strength'),
('fish', 'Fish', 'Dreams about fish, emotions, spirituality, or abundance'),
('horse', 'Horse', 'Dreams about horses, freedom, power, or life journey'),
('lion', 'Lion', 'Dreams about lions, courage, leadership, or primal strength'),
('mouse', 'Mouse', 'Dreams about mice, timidity, details, or small concerns'),
('owl', 'Owl', 'Dreams about owls, wisdom, night, or hidden knowledge'),
('rabbit', 'Rabbit', 'Dreams about rabbits, fertility, speed, or timidity'),
('shark', 'Shark', 'Dreams about sharks, danger, aggression, or hidden threats'),
('tiger', 'Tiger', 'Dreams about tigers, power, passion, or untamed nature'),
('wolf', 'Wolf', 'Dreams about wolves, wildness, pack mentality, or survival'),

-- Objects & Symbols
('money', 'Money', 'Dreams about wealth, currency, or financial concerns'),
('car', 'Car', 'Dreams about vehicles, control, or life direction'),
('phone', 'Phone', 'Dreams about communication, connection, or messages'),
('mirror', 'Mirror', 'Dreams about reflections, self-image, or truth'),
('book', 'Book', 'Dreams about books, knowledge, or stories'),
('key', 'Key', 'Dreams about keys, solutions, or access'),
('weapon', 'Weapon', 'Dreams about guns, knives, or instruments of harm'),
('treasure', 'Treasure', 'Dreams about valuable discoveries or hidden worth'),
('clock', 'Clock', 'Dreams about time, deadlines, or life passing'),
('broken_objects', 'Broken Objects', 'Dreams about things breaking or being damaged'),
('angel', 'Angel', 'Dreams about angels, divine messengers, protection, or spirituality'),
('balloon', 'Balloon', 'Dreams about balloons, celebration, fragility, or letting go'),
('candle', 'Candle', 'Dreams about candles, hope, spirituality, or life flame'),
('chair', 'Chair', 'Dreams about chairs, rest, position, or authority'),
('coin', 'Coin', 'Dreams about coins, small value, decisions, or chance'),
('crown', 'Crown', 'Dreams about crowns, achievement, authority, or recognition'),
('diamond', 'Diamond', 'Dreams about diamonds, value, hardness, or eternal love'),
('glasses', 'Glasses', 'Dreams about eyeglasses, vision, clarity, or perception'),
('hole', 'Hole', 'Dreams about holes, voids, emptiness, or opportunities'),
('ladder', 'Ladder', 'Dreams about ladders, ascension, progress, or spiritual climb'),
('mask', 'Mask', 'Dreams about masks, hidden identity, deception, or protection'),
('ring', 'Ring', 'Dreams about rings, commitment, cycles, or unity'),
('rope', 'Rope', 'Dreams about ropes, binding, connection, or restriction'),
('window', 'Window', 'Dreams about windows, opportunities, perspective, or barriers'),

-- States & Conditions
('late', 'Being Late', 'Dreams about running late or missing appointments'),
('lost_item', 'Lost Items', 'Dreams about losing important objects'),
('wrong_turn', 'Wrong Turn', 'Dreams about taking wrong directions or paths'),
('unprepared', 'Being Unprepared', 'Dreams about lacking preparation or resources'),
('forgotten', 'Forgetting', 'Dreams about forgetting important things or people'),
('invisible', 'Invisibility', 'Dreams about being unseen or ignored'),
('transformation', 'Transformation', 'Dreams about changing form or identity'),

-- Activities & Events
('party', 'Party', 'Dreams about celebrations, gatherings, or social events'),
('accident', 'Accident', 'Dreams about accidents, mishaps, or unexpected harmful events'),
('apocalypse', 'Apocalypse', 'Dreams about the end of the world or major disasters'),
('argument', 'Argument', 'Dreams about conflicts, disputes, or confrontations'),
('dance', 'Dancing', 'Dreams about dancing, movement, or self-expression'),
('eating', 'Eating', 'Dreams about food, nourishment, or consumption'),
('shopping', 'Shopping', 'Dreams about buying things or making choices'),
('war', 'War', 'Dreams about conflict, battles, or large-scale destruction'),

-- Childhood & Past
('childhood', 'Childhood', 'Dreams about being a child or childhood memories'),
('past', 'Past', 'Dreams about historical events or personal history'),
('old_friend', 'Old Friends', 'Dreams about friends from the past'),
('school_days', 'School Days', 'Dreams about school experiences or classmates'),

-- Spiritual & Mystical
('angel', 'Angel', 'Dreams about angels, divine messengers, or spiritual guides'),
('demon', 'Demon', 'Dreams about demons, evil forces, or inner darkness'),
('ghost', 'Ghost', 'Dreams about spirits, hauntings, or the past'),
('god', 'God', 'Dreams about deities, divine presence, or ultimate authority'),
('heaven', 'Heaven', 'Dreams about paradise, perfection, or spiritual reward'),
('hell', 'Hell', 'Dreams about punishment, suffering, or guilt'),
('magic', 'Magic', 'Dreams about supernatural powers or impossible events'),
('prayer', 'Prayer', 'Dreams about praying, seeking help, or spiritual connection'),

-- Technology & Modern Life
('computer', 'Computer', 'Dreams about technology, work, or digital life'),
('internet', 'Internet', 'Dreams about online connections or virtual worlds'),
('social_media', 'Social Media', 'Dreams about online presence or digital relationships'),
('robot', 'Robot', 'Dreams about artificial beings or automation'),

-- Abstract Concepts
('time', 'Time', 'Dreams about time passing, deadlines, or temporal distortion'),
('space', 'Space', 'Dreams about outer space, vastness, or exploration'),
('numbers', 'Numbers', 'Dreams featuring significant numbers or counting'),
('colors', 'Colors', 'Dreams dominated by specific colors or color symbolism'),
('light', 'Light', 'Dreams about illumination, clarity, or enlightenment'),
('darkness', 'Darkness', 'Dreams about darkness, unknown, or hidden aspects'),
('shadow', 'Shadow', 'Dreams about shadows, hidden selves, or following presences')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- =====================================================================
-- NOTE: Theme embeddings need to be generated separately
-- This should be done through the application's embedding service
-- after the themes are inserted
-- =====================================================================

-- Add a comment to remind about embedding generation
COMMENT ON TABLE themes IS 'Dream theme definitions. Note: BGE-M3 embeddings must be generated after inserting new themes.';

-- =====================================================================
-- SAMPLE TEST DATA (Optional - remove for production)
-- Uncomment the section below to add test data
-- =====================================================================

/*
-- Create a test user profile
INSERT INTO profiles (
  user_id,
  handle,
  username,
  sex,
  locale,
  dream_interpreter,
  onboarding_complete
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'testuser',
  'Test User',
  'unspecified',
  'en',
  'carl',
  true
) ON CONFLICT (user_id) DO NOTHING;

-- Create a test dream
INSERT INTO dreams (
  id,
  user_id,
  title,
  raw_transcript,
  transcription_status,
  mood,
  clarity
) VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Flying Over Mountains',
  'I was flying over beautiful snow-capped mountains. The view was breathtaking and I felt completely free.',
  'completed',
  5,
  85
) ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================================
-- END OF SEED DATA
-- =====================================================================
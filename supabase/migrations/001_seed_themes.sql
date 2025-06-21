-- Seed dream themes
-- This migration populates the themes table with common dream themes

INSERT INTO themes (code, label, description) VALUES
  -- Universal themes
  ('falling', 'Falling', 'Dreams about falling, losing balance, or dropping from heights'),
  ('flying', 'Flying', 'Dreams about flying, floating, or levitating'),
  ('being_chased', 'Being Chased', 'Dreams about being pursued or running from danger'),
  ('death', 'Death', 'Dreams about death, dying, or mortality'),
  ('lost', 'Being Lost', 'Dreams about being lost, unable to find your way'),
  ('escape', 'Escaping', 'Dreams about escaping from danger, confinement, or difficult situations'),
  ('trapped', 'Being Trapped', 'Dreams about being trapped, confined, or unable to move'),
  ('hiding', 'Hiding', 'Dreams about hiding from someone or something'),
  
  -- Relationship themes
  ('love', 'Love & Romance', 'Dreams about romantic relationships, love, or intimacy'),
  ('family', 'Family', 'Dreams involving family members or family dynamics'),
  ('friends', 'Friends', 'Dreams about friendships or social connections'),
  ('betrayal', 'Betrayal', 'Dreams about being betrayed or betraying others'),
  ('stranger', 'Strangers', 'Dreams involving unknown people or mysterious figures'),
  ('ex_partner', 'Ex-Partners', 'Dreams about former romantic partners or past relationships'),
  ('wedding', 'Wedding', 'Dreams about weddings, marriage ceremonies, or commitment'),
  ('reunion', 'Reunion', 'Dreams about reuniting with people from the past'),
  ('abandonment', 'Abandonment', 'Dreams about being abandoned or left behind'),
  
  -- Achievement/Failure
  ('success', 'Success', 'Dreams about achieving goals or succeeding'),
  ('failure', 'Failure', 'Dreams about failing, making mistakes, or inadequacy'),
  ('exam', 'Exams/Tests', 'Dreams about taking tests, being unprepared, or being evaluated'),
  ('competition', 'Competition', 'Dreams about races, contests, or competing with others'),
  ('performance', 'Performance', 'Dreams about performing on stage or in public'),
  ('interview', 'Interview', 'Dreams about job interviews or being questioned'),
  
  -- Body/Physical
  ('naked', 'Being Naked', 'Dreams about being naked or inappropriately dressed in public'),
  ('teeth', 'Teeth Falling Out', 'Dreams about losing teeth or dental problems'),
  ('pregnancy', 'Pregnancy', 'Dreams about being pregnant or giving birth'),
  ('illness', 'Illness', 'Dreams about being sick or diseased'),
  ('injury', 'Injury', 'Dreams about being wounded, hurt, or physically damaged'),
  ('hair', 'Hair', 'Dreams about hair loss, hair changes, or hair growth'),
  ('body_parts', 'Body Parts', 'Dreams focusing on specific body parts or organs'),
  ('paralysis', 'Paralysis', 'Dreams about being unable to move or speak'),
  ('aging', 'Aging', 'Dreams about growing old or seeing oneself at different ages'),
  
  -- Nature/Animals
  ('water', 'Water', 'Dreams featuring water, oceans, rivers, or drowning'),
  ('animals', 'Animals', 'Dreams featuring animals or creatures'),
  ('natural_disaster', 'Natural Disasters', 'Dreams about earthquakes, tsunamis, storms'),
  ('snake', 'Snakes', 'Dreams featuring snakes or serpents'),
  ('spider', 'Spiders', 'Dreams about spiders or being caught in webs'),
  ('dog', 'Dogs', 'Dreams featuring dogs, puppies, or canines'),
  ('cat', 'Cats', 'Dreams featuring cats, kittens, or felines'),
  ('bird', 'Birds', 'Dreams about birds, flying creatures, or wings'),
  ('insect', 'Insects', 'Dreams about bugs, insects, or small creatures'),
  ('ocean', 'Ocean', 'Dreams about the sea, waves, or vast waters'),
  ('forest', 'Forest', 'Dreams about woods, trees, or getting lost in nature'),
  ('mountain', 'Mountains', 'Dreams about climbing, mountains, or high places'),
  ('fire', 'Fire', 'Dreams about fire, flames, or burning'),
  ('storm', 'Storms', 'Dreams about thunderstorms, lightning, or severe weather'),
  
  -- Supernatural/Spiritual
  ('supernatural', 'Supernatural', 'Dreams about ghosts, spirits, or paranormal events'),
  ('religious', 'Religious/Spiritual', 'Dreams with religious or spiritual themes'),
  ('transformation', 'Transformation', 'Dreams about changing form or metamorphosis'),
  ('demon', 'Demons', 'Dreams about demons, devils, or evil entities'),
  ('angel', 'Angels', 'Dreams about angels, divine beings, or protectors'),
  ('magic', 'Magic', 'Dreams about magical powers, spells, or supernatural abilities'),
  ('afterlife', 'Afterlife', 'Dreams about heaven, hell, or life after death'),
  ('god', 'Divine Beings', 'Dreams about gods, goddesses, or supreme beings'),
  ('ritual', 'Rituals', 'Dreams about ceremonies, rituals, or sacred practices'),
  ('vampire', 'Vampires', 'Dreams about vampires, blood-drinking, or immortal beings'),
  ('witch', 'Witches', 'Dreams about witches, witchcraft, or sorcery'),
  
  -- Travel/Journey
  ('travel', 'Travel', 'Dreams about journeys, trips, or transportation'),
  ('vehicle', 'Vehicles', 'Dreams about cars, planes, or other vehicles'),
  ('late', 'Being Late', 'Dreams about running late or missing appointments'),
  ('train', 'Trains', 'Dreams about trains, railways, or train stations'),
  ('airplane', 'Airplanes', 'Dreams about flying in planes or airports'),
  ('ship', 'Ships', 'Dreams about boats, ships, or sailing'),
  ('car_accident', 'Car Accidents', 'Dreams about vehicle crashes or collisions'),
  ('road', 'Roads', 'Dreams about paths, highways, or journeys'),
  ('bridge', 'Bridges', 'Dreams about crossing bridges or transitions'),
  
  -- Conflict/Violence
  ('conflict', 'Conflict', 'Dreams about arguments, fights, or confrontations'),
  ('war', 'War', 'Dreams about war, battle, or large-scale conflict'),
  ('violence', 'Violence', 'Dreams involving violent acts or aggression'),
  ('murder', 'Murder', 'Dreams about killing or being killed'),
  ('weapon', 'Weapons', 'Dreams featuring guns, knives, or other weapons'),
  ('invasion', 'Invasion', 'Dreams about being invaded or territory being violated'),
  ('prison', 'Prison', 'Dreams about jail, confinement, or captivity'),
  ('crime', 'Crime', 'Dreams about criminal acts or being a victim of crime'),
  
  -- Home/Places
  ('home', 'Home', 'Dreams about your home or childhood home'),
  ('work', 'Work/School', 'Dreams about workplace or school environments'),
  ('unfamiliar_place', 'Unfamiliar Places', 'Dreams about strange or unknown locations'),
  ('basement', 'Basement', 'Dreams about basements, cellars, or underground spaces'),
  ('attic', 'Attic', 'Dreams about attics, upper rooms, or hidden spaces'),
  ('bathroom', 'Bathroom', 'Dreams about bathrooms, toilets, or privacy'),
  ('hospital', 'Hospital', 'Dreams about hospitals, medical facilities, or healing'),
  ('cemetery', 'Cemetery', 'Dreams about graveyards, tombstones, or burial grounds'),
  ('church', 'Church/Temple', 'Dreams about religious buildings or sacred spaces'),
  ('hotel', 'Hotel', 'Dreams about hotels, temporary lodging, or transient spaces'),
  ('mall', 'Shopping Mall', 'Dreams about shopping centers or marketplaces'),
  ('castle', 'Castle', 'Dreams about castles, fortresses, or grand buildings'),
  ('maze', 'Maze/Labyrinth', 'Dreams about being lost in mazes or complex paths'),
  
  -- Technology/Modern
  ('technology', 'Technology', 'Dreams about computers, phones, or technology'),
  ('social_media', 'Social Media', 'Dreams about social media or online interactions'),
  ('phone', 'Phone', 'Dreams about phone calls, messages, or communication devices'),
  ('computer', 'Computer', 'Dreams about computers, screens, or digital interfaces'),
  ('robot', 'Robots', 'Dreams about robots, androids, or mechanical beings'),
  ('ai', 'Artificial Intelligence', 'Dreams about AI, AGI, LLMs, chatbots,ChatGPT, or other AI-powered systems'),
  ('vr', 'Virtual Reality', 'Dreams about VR, Oculus, Meta, or other VR-related experiences'),
  ('space', 'Space', 'Dreams about space, rockets, moon, aliens, or outer space'),
  ('cyberpunk', 'Cyberpunk', 'Dreams about cyberpunk, bioimplants, or futuristic cities'),
  
  -- Emotions
  ('anxiety', 'Anxiety', 'Dreams characterized by anxiety or worry'),
  ('joy', 'Joy/Happiness', 'Dreams characterized by joy or happiness'),
  ('fear', 'Fear', 'Dreams characterized by fear or terror'),
  ('sadness', 'Sadness', 'Dreams characterized by sadness or grief'),
  ('anger', 'Anger', 'Dreams characterized by rage, fury, or frustration'),
  ('guilt', 'Guilt', 'Dreams characterized by guilt, shame, or regret'),
  ('loneliness', 'Loneliness', 'Dreams characterized by isolation or being alone'),
  
  -- Objects/Items
  ('money', 'Money', 'Dreams about wealth, coins, bills, or financial matters'),
  ('key', 'Keys', 'Dreams about keys, locks, or access'),
  ('mirror', 'Mirrors', 'Dreams about reflections, mirrors, or self-image'),
  ('door', 'Doors', 'Dreams about doors, entrances, or passages'),
  ('box', 'Boxes', 'Dreams about containers, packages, or hidden contents'),
  ('book', 'Books', 'Dreams about reading, books, or knowledge'),
  ('jewelry', 'Jewelry', 'Dreams about gems, rings, or precious items'),
  ('food', 'Food', 'Dreams about eating, cooking, or food'),
  ('clothes', 'Clothing', 'Dreams about clothes, dressing, or appearance'),
  ('treasure', 'Treasure', 'Dreams about finding treasure or valuable items'),
  ('letter', 'Letters/Messages', 'Dreams about receiving mail or important messages'),
  ('gift', 'Gifts', 'Dreams about giving or receiving presents'),
  
  -- People/Roles
  ('baby', 'Babies', 'Dreams about infants, newborns, or new beginnings'),
  ('child', 'Children', 'Dreams about children or childhood'),
  ('elder', 'Elderly', 'Dreams about old people, wisdom, or aging'),
  ('teacher', 'Teachers', 'Dreams about instructors, mentors, or authority figures'),
  ('doctor', 'Doctors', 'Dreams about physicians, healers, or medical professionals'),
  ('police', 'Police', 'Dreams about law enforcement or authority'),
  ('celebrity', 'Celebrities', 'Dreams about famous people or public figures'),
  ('twin', 'Twins', 'Dreams about doubles, twins, or doppelgangers'),
  
  -- Time/Temporal
  ('past', 'Past', 'Dreams about past events, memories, or nostalgia'),
  ('future', 'Future', 'Dreams about future events or time travel'),
  ('apocalypse', 'Apocalypse', 'Dreams about the end of the world or civilization'),
  ('time_loop', 'Time Loop', 'Dreams about repeating events or being stuck in time'),
  
  -- Lucid/Special
  ('lucid', 'Lucid Dreaming', 'Dreams where you realize you are dreaming'),
  ('recurring', 'Recurring', 'Dreams that repeat with similar themes or scenes'),
  ('prophetic', 'Prophetic', 'Dreams that seem to predict future events'),
  ('nightmare', 'Nightmares', 'Intensely frightening or disturbing dreams'),
  ('sleep_paralysis', 'Sleep Paralysis', 'Dreams involving inability to move upon waking'),
  ('false_awakening', 'False Awakening', 'Dreams about waking up while still dreaming')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;
# Somni Backend Service - ElevenLabs Integration Layer

## Background and Motivation

Building a dedicated backend service that acts as a secure gateway for all ElevenLabs interactions for a mobile app. This service will handle transcription now and conversational AI in the future, integrating with Supabase for data management and authentication.

**Key Requirements:**

- Secure API key management (ElevenLabs API key never exposed to client)
- Audio transcription using ElevenLabs Speech-to-Text
- Integration with Supabase for authentication and data storage
- Railway deployment ready
- Future-proof for conversational AI features
- Rate limiting and security best practices

**MAJOR NEW FEATURE - FREUDIAN DREAM INTERPRETER:**

Expanding our sophisticated AI-powered dream interpretation service to include Dr. Freud alongside the existing Jungian interpreter. The system will now feature two powerful analytical approaches:

- **Jungian Interpreter**: Deep psychological analysis focusing on individuation, shadow work, and archetypal symbols (✅ **IMPLEMENTED**)
- **Freudian Interpreter**: Classic psychoanalytic interpretation focusing on unconscious desires, repression, and sexual symbolism (✅ **IMPLEMENTED & REBALANCED**)

**NEW MAJOR FEATURE - NEUROSCIENTIST DREAM INTERPRETER:**

Expanding our sophisticated AI-powered dream interpretation service to include evidence-based neuroscience alongside the existing psychological interpreters. The system will now feature three powerful analytical approaches:

- **Jungian Interpreter**: Deep psychological analysis focusing on individuation, shadow work, and archetypal symbols (✅ **IMPLEMENTED**)
- **Freudian Interpreter**: Classic psychoanalytic interpretation focusing on unconscious desires, repression, and sexual symbolism (✅ **IMPLEMENTED & REBALANCED**)
- **Neuroscientist Interpreter**: Evidence-based sleep science interpretation with Dr. Mary Carskadon's warm, educational approach (🔄 **IN PROGRESS**)

**NEUROSCIENTIST INTERPRETER APPROACH:**

The neuroscientist interpreter will provide evidence-based dream analysis using:

1. **Dr. Mary Carskadon's Voice**: Pioneering sleep researcher with warm, approachable professor personality
2. **Evidence-Based Framework**:
   - Continuity Hypothesis: Connects dreams to recent waking experiences
   - Threat Simulation: Analyzes survival rehearsal patterns
   - NEXTUP Model: Identifies creative problem-solving connections
   - Emotion Regulation: Tracks how REM processes feelings
   - Memory Consolidation: Shows how the brain files experiences
3. **Smart Pattern Detection**: Automatically detects and includes specialized analyses only when relevant
4. **Unique JSON Structure**: Uses brainActivity, continuityLinks, adaptiveFunction, neuroscienceEducation, and reflectiveQuestion instead of traditional symbols
5. **Scientific Yet Accessible Language**: Technical terms explained in parentheses with metaphors

**CURRENT ISSUE - SEXUAL THEME OVER-AVOIDANCE:**

User feedback indicates the Freudian interpreter has overcorrected and is now avoiding sexual themes too much. While we successfully eliminated crude reductionism, we've made Freud too reserved. Authentically Freudian interpretations should include sexual analysis when contextually appropriate - avoiding sexual themes entirely is not true to Freud's approach.

**Enhanced Architecture:**

```
Mobile App → Supabase Edge Functions → Somni Backend Service → OpenRouter API
                    ↓                        ↓
               Dream Interpretation     Llama 4 Scout (Free)
                    ↓                        ↓
      Jung, Freud & Neuroscientist → Structured JSON Responses
```

**Key Innovation**: Triple-interpreter system allowing users to get Jungian (transformative individuation), Freudian (unconscious psychoanalytic), and Neuroscientist (evidence-based sleep science) perspectives on the same dream.

## Key Challenges and Analysis

### Current Problem Analysis - Sexual Theme Avoidance:

**Root Cause Identification:**

1. **Over-Cautious Guidance**: The prompt contains strong warnings against sexual interpretation:

   - "Not every dream is about sex or parents"
   - "avoid crude reductionism"
   - "Be sophisticated - avoid crude reductionism"
   - This has made the LLM overly hesitant to include sexual analysis even when appropriate

2. **Conditional Sexual Analysis**: The `sexualAnalysis` field is marked as "ONLY if sexual themes are clearly present" with emphasis on "not crude interpretation" - this creates too high a bar for sexual theme detection

3. **Emphasis on Non-Sexual Theories**: The prompt heavily emphasizes Freud's non-sexual theories (death drive, narcissistic injury, ego defenses) without balancing emphasis on libidinal theory

4. **Symbol Detection Not Utilized**: The `identifyPotentialSexualSymbols()` method exists but isn't being leveraged in the prompt to guide appropriate sexual analysis

### Authentic Freudian Balance Needed:

**What Freud Actually Believed:**

- Sexual drive (libido) is fundamental to human psychology and dream formation
- Sexual symbolism is pervasive in dreams, but not the only interpretation
- Psychosexual development continues influencing adult dreams
- Sexual repression creates many psychological symptoms and dream distortions
- Sexual themes should be addressed directly but thoughtfully, not avoided

**The Rebalancing Challenge:**

- Maintain sophistication while allowing appropriate sexual analysis
- Include sexual themes when contextually relevant without being reductive
- Balance sexual interpretation with other psychoanalytic concepts
- Preserve therapeutic appropriateness while being authentically Freudian

### Technical Challenges for Freudian Rebalancing:

1. **Prompt Guidance Refinement**: Rewrite guidance to encourage appropriate sexual analysis rather than discourage it
2. **Sexual Symbol Integration**: Better leverage the sexual symbol detection system in prompts
3. **Contextual Sexual Analysis**: Create clearer criteria for when sexual analysis is appropriate
4. **Authentic Voice Maintenance**: Ensure Freud doesn't become crude while addressing sexual themes
5. **Testing for Balance**: Develop tests that verify sexual themes are included when appropriate

### Architecture Decisions for Freudian Rebalancing:

- **Prompt Refinement**: Update `buildOutputFormat()` with balanced sexual theme guidance
- **Symbol Integration**: Better utilize `identifyPotentialSexualSymbols()` output in prompts
- **Conditional Logic**: Refine when `sexualAnalysis` field should be included
- **Voice Calibration**: Maintain Dr. Freud's authentic voice while addressing sexual content
- **Quality Testing**: Create specific tests for sexual theme appropriateness

## High-level Task Breakdown

### Phase 1: Problem Analysis ✅ **COMPLETED**

- [x] **Task 1.1**: Analyze current sexual theme avoidance in Freudian interpreter
  - Success Criteria: Identified root causes of over-avoidance
- [x] **Task 1.2**: Review authentic Freudian approach to sexual themes
  - Success Criteria: Clear understanding of appropriate sexual analysis balance
- [x] **Task 1.3**: Examine current prompt guidance and symbol detection logic
  - Success Criteria: Specific areas for refinement identified

### Phase 2: Prompt Rebalancing ✅ **COMPLETED**

- [x] **Task 2.1**: Refine system prompt guidance for balanced sexual analysis
  - Success Criteria: Guidance encourages appropriate sexual themes without crude reductionism ✅
  - Implementation: Updated `buildInterpreterSpecificSystemPrompt()` with balanced approach
  - **COMPLETED**: System prompt now includes positive guidance about sexual themes being "fundamental to psychology" and "essential to authentic psychoanalytic work"
- [x] **Task 2.2**: Enhance output format instructions for sexual theme inclusion
  - Success Criteria: Clear criteria for when sexual analysis should be included ✅
  - Implementation: Refined `buildOutputFormat()` with contextual sexual analysis guidance
  - **COMPLETED**: Changed from "ONLY if clearly present" to "ONLY if contextually relevant" - lowered the bar for sexual theme inclusion
- [x] **Task 2.3**: Integrate sexual symbol detection into prompt logic
  - Success Criteria: Sexual symbols detected in dreams inform analysis approach ✅
  - Implementation: Utilized `identifyPotentialSexualSymbols()` output in template variables
  - **COMPLETED**: Sexual symbols now actively detected and included in prompt to guide analysis

### Phase 3: Conditional Logic Refinement ✅ **COMPLETED**

- [x] **Task 3.1**: Refine sexual analysis inclusion criteria
  - Success Criteria: `sexualAnalysis` field included when appropriate, not just when "clearly present" ✅
  - Implementation: Updated conditional logic for sexual theme detection
  - **COMPLETED**: Changed criteria from "clearly present" to "contextually relevant" throughout
- [x] **Task 3.2**: Balance sexual themes with other psychoanalytic concepts
  - Success Criteria: Sexual analysis coexists with professional, social, and anxiety themes ✅
  - Implementation: Ensured sexual themes don't dominate but aren't avoided
  - **COMPLETED**: Guidance now explicitly states "Balance sexual interpretation with other concepts"
- [x] **Task 3.3**: Calibrate authentic Freudian voice for sexual content
  - Success Criteria: Maintains therapeutic professionalism while being authentically Freudian ✅
  - Implementation: Voice guidance that allows direct sexual analysis without being inappropriate
  - **COMPLETED**: Added "Be therapeutically professional but not prudish - Freud addressed sexual themes directly"

### Phase 4: Testing and Validation

- [ ] **Task 4.1**: Create test dreams with appropriate sexual content
  - Success Criteria: Dreams that should legitimately include sexual analysis
  - Implementation: Develop test cases where sexual themes are contextually relevant
- [ ] **Task 4.2**: Test balanced sexual theme inclusion
  - Success Criteria: Sexual analysis appears when appropriate, balanced with other themes
  - Implementation: Run tests and verify appropriate sexual theme inclusion
- [ ] **Task 4.3**: Validate authentic Freudian voice with sexual content
  - Success Criteria: Professional, therapeutic, but authentically Freudian approach to sexual themes
  - Implementation: Review outputs for appropriate tone and content balance

### Phase 5: Quality Assurance

- [ ] **Task 5.1**: Compare with historical Freudian interpretations
  - Success Criteria: Analysis style matches authentic Freudian approach to sexual themes
  - Quality Check: Sexual themes included appropriately without dominating
- [ ] **Task 5.2**: Ensure no regression in non-sexual dreams
  - Success Criteria: Dreams without sexual content still get appropriate non-sexual analysis
  - Implementation: Test variety of dreams to ensure balance across all theme types
- [ ] **Task 5.3**: User feedback validation
  - Success Criteria: User confirms Freudian interpreter feels authentically balanced
  - Implementation: User testing with rebalanced interpreter

### Phase 6: Neuroscientist Interpreter Implementation

- [ ] **Task 6.1**: Update types definition for NeuroscientistInsights
- [ ] **Task 6.2**: Implement NeuroscientistPromptBuilder
- [ ] **Task 6.3**: Implement NeuroscientistInterpreter parser
- [ ] **Task 6.4**: Update InterpretationParser to support neuroscientist
- [ ] **Task 6.5**: Create neuroscientist module exports

## Project Status Board

### ✅ Current Sprint: Neuroscientist Interpreter Implementation - COMPLETED ✅

**EXECUTOR MODE** - ✅ **ALL NEUROSCIENTIST IMPLEMENTATION TASKS COMPLETED SUCCESSFULLY**

- [x] ✅ **Task 6.1**: Update types definition for NeuroscientistInsights
- [x] ✅ **Task 6.2**: Implement NeuroscientistPromptBuilder
- [x] ✅ **Task 6.3**: Implement NeuroscientistInterpreter parser
- [x] ✅ **Task 6.4**: Update InterpretationParser to support neuroscientist
- [x] ✅ **Task 6.5**: Create neuroscientist module exports

**🎉 IMPLEMENTATION COMPLETE**: Dr. Mary Carskadon-inspired evidence-based neuroscience interpreter successfully implemented with:

- Evidence-based framework (Continuity Hypothesis, Threat Simulation, Memory Consolidation, etc.)
- Intelligent pattern detection for optional specialized analyses
- Warm, educational voice with scientific accessibility
- Proper TypeScript integration and error handling
- Consistent architecture with Jung/Freud interpreters

### ✅ Current Sprint: Opening Variety Fix - IN PROGRESS

**EXECUTOR MODE** - 🔄 **IMPLEMENTING VARIED INTERPRETER OPENINGS**

**PROBLEM IDENTIFIED**: All three interpreters are starting with repetitive, predictable openings:

- Jung: Always "You, at 28 years old..."
- Freud: Always "This dream..."
- Neuroscientist: Always "This dream..."

**SOLUTION IMPLEMENTED**:

- [x] ✅ **Jung**: Added 10 authentic opening variations with immediate engagement
- [x] ✅ **Freud**: Added 12 authoritative psychoanalytic opening variations
- [x] ✅ **Neuroscientist**: Added 14 expert neuroscience opening variations
- [ ] 🔄 **Testing**: Verify varied openings work correctly in practice

**KEY IMPROVEMENTS**:

- Each interpreter now has unique, authentic opening styles
- Openings are chosen based on dream content
- Eliminated repetitive "You, at [age]", "This dream", and generic starts
- Maintained each interpreter's distinct personality and expertise

### ✅ Previous Sprint: Freudian Sexual Theme Rebalancing - COMPLETED

**EXECUTOR MODE** - ✅ **ALL REBALANCING TASKS COMPLETED SUCCESSFULLY**

- [x] **COMPLETED**: Analysis of current sexual theme avoidance problem
- [x] **COMPLETED**: Phase 2 - Prompt Rebalancing (all 3 tasks)
- [x] **COMPLETED**: Phase 3 - Conditional Logic Refinement (all 3 tasks)
- [x] ✅ Refined system prompt for balanced sexual analysis approach
- [x] ✅ Updated output format instructions for contextual sexual theme inclusion
- [x] ✅ Integrated sexual symbol detection into prompt logic

### ✅ Current Sprint: Comprehensive Interpreter Improvements - IN PROGRESS

**EXECUTOR MODE** - 🔄 **APPLYING MAJOR INTERPRETER ENHANCEMENTS**

**TASK**: Apply comprehensive improvements to all three interpreters (Jung, Freud, Neuroscientist) with enhanced vocabulary, voice, and sophisticated analysis capabilities.

**Key Improvements Being Applied**:

**Jung Interpreter Enhancements:**

- [x] 🔄 **Richer Jungian vocabulary**: Add individuation, Self (capital S), anima/animus, complexes, collective unconscious, transcendent function
- [x] 🔄 **More personal voice**: Enhanced warmth and direct engagement, making Jung feel more present
- [x] 🔄 **Deeper insights**: Required connections to mythology/fairy tales and specific compensatory functions
- [x] 🔄 **Varied openings**: Expanded from 10 to 12 opening variations including references to numinous qualities and years of experience
- [x] 🔄 **Specific vs generic**: Added explicit requirements to avoid generic statements and make specific connections to dreamer's life
- [x] 🔄 **Simplified approach**: Removed keyword detection methods, letting LLM do intelligent analysis

**Freud Interpreter Enhancements:**

- [x] 🔄 **Sophisticated psychoanalytic vocabulary**: Add cathexis, libidinal economy, primary/secondary process, parapraxes
- [x] 🔄 **More authoritative yet warm**: Balanced penetrating insight with therapeutic care
- [x] 🔄 **Dream-work mechanisms**: Added explicit requirement to explain condensation, displacement, and symbolization
- [x] 🔄 **Balanced analysis**: Sexual themes important but balanced with other drives (aggression, death drive, ego preservation)
- [x] 🔄 **Case references**: Added ability to reference famous cases when patterns align
- [x] 🔄 **Always includes dream-work analysis**: Made this a required field to show sophisticated understanding
- [x] 🔄 **Simplified approach**: Removed keyword detection methods, letting LLM do intelligent analysis

**Neuroscientist Enhancements:**

- [x] 🔄 **Rich neuroscientific vocabulary**: Add specific brain regions, neurotransmitters, sleep phenomena (PGO waves, sleep spindles, etc.)
- [x] 🔄 **More enthusiastic voice**: Added expressions like "Now THIS is fascinating!", "extraordinary!", showing genuine excitement
- [x] 🔄 **Personal research references**: Enhanced with "In my lab...", "This reminds me of a study..."
- [x] 🔄 **Educational without lecturing**: Natural weaving of neuroscience education with analogies and "fun facts"
- [x] 🔄 **Specific brain activity**: Required 3 specific brain regions with detailed activity descriptions
- [x] 🔄 **Sleep stage precision**: Using N1, N2, N3, REM terminology with timing estimates
- [x] 🔄 **Simplified approach**: Removed keyword detection methods, letting LLM do intelligent analysis

**Overall Improvements:**

- [ ] 🔄 **12-15 opening variations**: Each interpreter now has extensive opening variety to prevent repetition
- [ ] 🔄 **More explicit requirements**: For avoiding generic responses
- [ ] 🔄 **Enhanced vocabulary richness**: For each school of thought
- [ ] 🔄 **Stronger personal voice**: For each interpreter
- [ ] 🔄 **Better connection**: To the dreamer's specific situation
- [ ] 🔄 **Required elements**: That showcase each interpreter's unique expertise
- [ ] 🔄 **Architectural simplification**: Removed keyword detection methods, letting LLM do intelligent analysis

**Implementation Plan:**

- [ ] 🔄 **Task 1**: Update Jung interpreter with enhanced vocabulary and voice
- [ ] 🔄 **Task 2**: Update Freud interpreter with sophisticated psychoanalytic enhancements
- [ ] 🔄 **Task 3**: Update Neuroscientist interpreter with rich scientific vocabulary and enthusiasm
- [ ] 🔄 **Task 4**: Test all interpreters to ensure improvements work correctly
- [ ] 🔄 **Task 5**: Update scratchpad with completion status

## Executor's Feedback or Assistance Requests

### ✅ NEUROSCIENTIST INTERPRETER & TEST FILES - IMPLEMENTATION COMPLETE & ENHANCED

**Date**: Current session  
**Status**: ✅ **FULLY IMPLEMENTED, TESTED & SIGNIFICANTLY IMPROVED WITH SCIENTIFIC NUANCE**

**Latest Enhancement - Scientific Voice Refinement:**

- **✅ UPGRADED**: Added dynamic certainty levels based on scientific knowledge
- **✅ UPGRADED**: Varied interpretive styles to prevent formulaic responses
- **✅ UPGRADED**: Enhanced scientific accuracy with appropriate uncertainty
- **✅ UPGRADED**: More natural acknowledgment of research limitations

**Scientific Voice Guidelines Added:**

- **Confident Authority**: For well-established findings ("REM sleep is associated with vivid dreams")
- **Probabilistic Analysis**: For specific brain activity ("patterns suggest heightened limbic activity")
- **Curious Speculation**: For unusual patterns ("This is fascinating - it might indicate...")
- **Appropriate Uncertainty**: Save hedging for unprovable specifics about their brain
- **Natural Limitations**: "Without EEG data, I can't pinpoint the exact sleep stage, but..."

**Dynamic Interpretive Approaches:**

- Sometimes lead with surprising lab findings
- Other times start with what struck you about their specific dream
- Occasionally begin with questions their dream raises
- Mix technical insights with accessible explanations
- Include personal research observations when relevant

**Enhanced Voice Examples:**

- **Flying Dreams**: "Flying dreams fascinate me because they're one of the few dream experiences that have no waking equivalent. Your brain created this sensation entirely from scratch!"
- **Nightmares**: "After decades of studying nightmares, I can tell you with certainty that your brain's threat simulation system was working overtime here."
- **Memory Processing**: "This looks like a textbook case of memory consolidation. Your hippocampus appears to be filing away recent experiences..."

**Major Enhancement Applied - Addressing Vagueness:**

- **✅ UPGRADED**: Dr. Mary Carskadon's voice now reflects 50+ years of research experience
- **✅ UPGRADED**: System prompt emphasizes specificity over generic responses
- **✅ UPGRADED**: Output format guides toward unique insights rather than standard sleep facts
- **✅ UPGRADED**: Fallback response is now expert-level and specific rather than generic
- **✅ UPGRADED**: Added scientific nuance with appropriate certainty levels

**Before Enhancement (Too Vague):**

- Generic phrases like "Your brain was busy processing..."
- Standard REM sleep facts without connection to specific dream
- Overused metaphors like "nighttime maintenance crew"
- Could have come from any sleep app or Google search

**After Enhancement (Expert & Scientifically Nuanced):**

- Dr. Carskadon speaks with 50+ years of authority: "In my lab, we've seen..."
- Specific brain region analysis with explanations: "Your amygdala - that's your emotional alarm system"
- Unique insights based on individual dream patterns
- Expert observations about timing, neurotransmitter activity, memory replay patterns
- Avoids generic responses and focuses on what makes THIS dream unique
- **NEW**: Varies certainty appropriately - confident about established science, curious about specifics
- **NEW**: Dynamic interpretive styles prevent formulaic responses
- **NEW**: Natural acknowledgment of scientific limitations

**Implementation Summary**:

- Successfully implemented all 5 tasks for the neuroscientist interpreter
- Updated `NeuroscientistInsights` type definition with proper structure including optional specialized analyses
- Created `NeuroscientistPromptBuilder` with Dr. Mary Carskadon's authoritative, experienced voice
- Implemented robust `NeuroscientistInterpreter` parser with proper error handling and expert fallback responses
- Integrated neuroscientist case into main `InterpretationParser`
- Created proper module exports structure
- **✅ FIXED**: Updated `PromptBuilderFactory` to include `NeuroscientistPromptBuilder` - **neuroscientist interpreter now working**
- **✅ ENHANCED**: Completely redesigned prompts to eliminate vagueness and generic responses
- **✅ REFINED**: Added scientific nuance with dynamic voice and appropriate certainty levels
- **TypeScript compilation successful** - no compilation errors

**Test Files Created & UUID-Updated**:

1. ✅ `single-neuro-test.sh` - Single dream test with **UUID generation**
2. ✅ `test-dreams-neuro.sh`

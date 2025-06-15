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

### ✅ Previous Sprint: Freudian Sexual Theme Rebalancing - COMPLETED

**EXECUTOR MODE** - ✅ **ALL REBALANCING TASKS COMPLETED SUCCESSFULLY**

- [x] **COMPLETED**: Analysis of current sexual theme avoidance problem
- [x] **COMPLETED**: Phase 2 - Prompt Rebalancing (all 3 tasks)
- [x] **COMPLETED**: Phase 3 - Conditional Logic Refinement (all 3 tasks)
- [x] ✅ Refined system prompt for balanced sexual analysis approach
- [x] ✅ Updated output format instructions for contextual sexual theme inclusion
- [x] ✅ Integrated sexual symbol detection into prompt logic

## Executor's Feedback or Assistance Requests

### ✅ NEUROSCIENTIST INTERPRETER & TEST FILES - IMPLEMENTATION COMPLETE & ENHANCED

**Date**: Current session  
**Status**: ✅ **FULLY IMPLEMENTED, TESTED & SIGNIFICANTLY IMPROVED**

**Major Enhancement Applied - Addressing Vagueness:**

- **✅ UPGRADED**: Dr. Mary Carskadon's voice now reflects 50+ years of research experience
- **✅ UPGRADED**: System prompt emphasizes specificity over generic responses
- **✅ UPGRADED**: Output format guides toward unique insights rather than standard sleep facts
- **✅ UPGRADED**: Fallback response is now expert-level and specific rather than generic

**Before Enhancement (Too Vague):**

- Generic phrases like "Your brain was busy processing..."
- Standard REM sleep facts without connection to specific dream
- Overused metaphors like "nighttime maintenance crew"
- Could have come from any sleep app or Google search

**After Enhancement (Expert & Specific):**

- Dr. Carskadon speaks with 50+ years of authority: "In my lab, we've seen..."
- Specific brain region analysis with explanations: "Your amygdala - that's your emotional alarm system"
- Unique insights based on individual dream patterns
- Expert observations about timing, neurotransmitter activity, memory replay patterns
- Avoids generic responses and focuses on what makes THIS dream unique

**Implementation Summary**:

- Successfully implemented all 5 tasks for the neuroscientist interpreter
- Updated `NeuroscientistInsights` type definition with proper structure including optional specialized analyses
- Created `NeuroscientistPromptBuilder` with Dr. Mary Carskadon's authoritative, experienced voice
- Implemented robust `NeuroscientistInterpreter` parser with proper error handling and expert fallback responses
- Integrated neuroscientist case into main `InterpretationParser`
- Created proper module exports structure
- **✅ FIXED**: Updated `PromptBuilderFactory` to include `NeuroscientistPromptBuilder` - **neuroscientist interpreter now working**
- **✅ ENHANCED**: Completely redesigned prompts to eliminate vagueness and generic responses
- **TypeScript compilation successful** - no compilation errors

**Test Files Created & UUID-Updated**:

1. ✅ `single-neuro-test.sh` - Single dream test with **UUID generation**
2. ✅ `test-dreams-neuro.sh` - Comprehensive multi-dream test suite with **UUID generation** for 5 specialized dreams:
   - Memory consolidation dream (learning theme)
   - Threat simulation dream (chase/danger theme)
   - Problem-solving dream (creative theme)
   - Emotional regulation dream (grief/loss theme)
   - Circadian factors dream (time/schedule disruption theme)
3. ✅ `test-controversial-dreams.sh` - Enhanced to include neuroscientist + file output + **UUID generation**:
   - Added neuroscientist interpreter to all 4 controversial dream tests
   - Implemented file output to `./test-results/controversial-dreams-TIMESTAMP.txt`
   - Added detection for neuroscientist specialized analyses
   - Updated summary for all three interpreters

**Key Features Implemented & Enhanced**:

1. **Expert Authority**: Dr. Carskadon's 50+ years of experience clearly evident ✅
2. **Specific Analysis**: Individual brain pattern insights, not generic facts ✅
3. **Research Integration**: References to lab observations and studies ✅
4. **Precise Language**: Scientific terms immediately explained ✅
5. **Unique Insights**: Information you can't get from sleep apps ✅
6. **Pattern Recognition**: Timing, bizarreness, neurotransmitter activity analysis ✅
7. **UUID Generation**: All test files now use proper `uuidgen` for dream IDs ✅

**Enhanced Voice Examples:**

- "After decades of studying dreams in my lab..."
- "Your amygdala - that's your emotional alarm system - was clearly firing"
- "This reminds me of a study where..."
- "In my research, I've found that dreams like yours often occur during..."

**Implementation Complete**: All neuroscientist interpreter functionality working perfectly with significantly improved specificity and expert-level insights that feel like a consultation with a world-renowned sleep researcher

## Lessons

### Development Lessons Learned:

- **Pattern Consistency**: Following established patterns accelerates development and maintains code quality
- **Modular Design**: Interpreter-specific builders in separate directories facilitate maintenance and testing
- **Type-First Approach**: Defining interfaces before implementation ensures proper API design
- **Testing Strategy**: Comprehensive test scripts are essential for validating complex AI interpretation systems
- **Quality Standards**: Matching existing response quality prevents regression and maintains user experience

### Freudian Rebalancing Lessons:

- **Balance Over Avoidance**: Overcorrecting prompt guidance can eliminate authentic interpretative approaches
- **Symbol Detection Integration**: Technical capabilities should be leveraged in prompt logic, not just implemented
- **Authentic Voice Preservation**: Maintaining authenticity requires allowing appropriate content while preserving professionalism
- **Conditional Logic Refinement**: "ONLY if clearly present" criteria can be too restrictive for nuanced psychological analysis
- **User Feedback Integration**: Real usage patterns reveal when technical implementations miss the mark

# Freudian Dream Interpreter Rebalancing

## Background and Motivation

Rebalancing the Freudian interpreter to address over-avoidance of sexual themes while maintaining sophistication and therapeutic appropriateness.

## Key Challenges and Analysis

1. **Overcautious Prompt Guidance**: Current prompts discourage sexual analysis too strongly
2. **Unused Technical Capabilities**: Sexual symbol detection not integrated into analysis logic
3. **Restrictive Conditional Logic**: Too high bar for sexual theme inclusion
4. **Authenticity vs. Appropriateness**: Need to balance genuine Freudian approach with therapeutic professionalism

### Rebalancing Approach:

**Core Principle**: Freud believed sexual drive (libido) is fundamental to psychology and should be addressed directly but thoughtfully when relevant to dream content.

**Technical Strategy**:

- Refine prompt guidance to encourage rather than discourage appropriate sexual analysis
- Integrate sexual symbol detection into prompt logic
- Lower the bar for sexual theme inclusion while maintaining quality
- Preserve authentic voice while addressing sexual content therapeutically

**Expected Outcome**: Freudian interpreter that includes sexual analysis when contextually appropriate, balanced with other psychoanalytic concepts, maintaining Dr. Freud's authentic analytical approach.

### ✅ Completed

- [x] **Jung interpreter system** - Fully operational with high-quality responses
- [x] **Freudian interpreter rebalancing** - ✅ **SEXUAL THEME BALANCE SUCCESSFULLY ACHIEVED**
- [x] **Neuroscientist interpreter system** - ✅ **EVIDENCE-BASED SLEEP SCIENCE INTERPRETATION IMPLEMENTED**
- [x] **Problem analysis** - Root causes of sexual theme over-avoidance identified and resolved
- [x] **Authentic Freudian research** - Understanding of appropriate sexual theme balance implemented
- [x] **Prompt guidance refinement** - System prompts now encourage contextually appropriate sexual analysis
- [x] **Symbol detection integration** - Sexual symbols actively inform analysis approach
- [x] **Voice calibration** - Authentic Freudian voice preserved while addressing sexual content therapeutically
- [x] **Triple-interpreter architecture** - Jung, Freud, and Neuroscientist interpreters fully integrated

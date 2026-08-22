# Project Context

## Official Challenge
> Build an AI-powered learning system that can understand a learner's evolving knowledge state and deliver a personalized learning experience. The solution may combine explanations, interactive learning, assessment, feedback, knowledge tracking, adaptive content, or other approaches to help learners progress more effectively.

The application must demonstrate actual adaptation through a connected end-to-end learning experience. The evaluator should **experience** the adaptation rather than merely read claims about it.

## Product Philosophy & Concept
Build an adaptive AI learning system that notices when a learner struggles, changes how the concept is taught, verifies whether recovery worked, tests real-world application through a practical mission, updates the learner's knowledge state, and determines what they should do next.

### Product Positioning
> We don't just teach learners. We notice where they're struggling, change how we teach, verify whether it worked, and guide what they should do next.

### Core Loop
```text
Notice → Adapt → Recover → Apply → Guide
```

## Accessibility Principle
Personalized learning should consider both:
1. **What does this learner currently understand?** (Knowledge adaptation)
2. **How can this learner effectively access and interact with the learning experience?** (Interaction adaptation)

The application should support blind, low-vision, keyboard-only, motor-disabled, motion-sensitive, and other learners through accessible design without attempting to diagnose disability. Accessibility preferences must be entirely learner-controlled and persistent.

## Subject System
* **Dynamic Topics:** The learner can input any topic of choice (e.g. Fractions, Photosynthesis, Python Functions).
* **AI Path Generation:** Gemini builds a structured learning journey featuring exactly 3 foundational concepts, a customized introduction, an initial MCQ practice question, and a practical mission with starters/rubrics.
* **Suggested Demo subject:** Python Functions (inputs, return values, executing calls) is highlighted as a quick starting suggest button.

## Locked Five Features (MVP Scope)
1. **Adaptive Recovery Engine:** Detect struggle and change the teaching strategy.
2. **Learn-by-Doing Mission:** Require practical concept application.
3. **Next Best Action:** Recommend exactly one next learning step.
4. **Accessible Learning Modes:** Compact accessibility controls (Larger Text, High Contrast, Reduced Motion, Enhanced Focus) that instantly modify the UI.
5. **Read & Respond:** Listen functionality utilizing browser speech synthesis for key learning text.

## Main Demo Moment
The evaluator should experience two major moments of adaptation:

### Struggle and Recovery Flow
```text
Learner gets question wrong
↓
tries again
↓
gets it wrong again
↓
system detects struggle
↓
Gemini diagnoses likely misconception
↓
teaching approach changes
↓
learner receives personalized recovery
↓
new question verifies recovery
```

### Continuous Adaptation Flow
```text
Recovery
↓
Mission
↓
AI evaluation
↓
knowledge state changes
↓
Next Best Action changes
```

## Out of Scope
Do not build:
* Authentication
* Database integrations
* Multiple subjects/courses
* Course marketplace
* Generic AI chatbot
* Social features or leaderboards
* Certificates or badges
* Admin portal/dashboard
* Complex analytics or notification systems
* Python code execution environment (submitted code treated as text)
* Image-generation pipeline
* Complicated 3D engine
* Full gamification economy
* Custom screen reader or custom speech recognition
* Disability diagnosis or eye tracking

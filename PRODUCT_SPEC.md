# Product Specification

This document defines the exact workflow, functional behaviors, and state machine transitions for the application.

## 1. Core Workflow Stages

### Stage 1: Welcome (Topic Input)
* **Goal:** Allow the learner to enter any topic and give immediate access to customization controls.
* **Content:** 
  * Headline: *"What do you want to learn?"*
  * Supporting copy: *"Enter a topic and we'll build a focused learning path that adapts as you go."*
  * Form Input: Trimmed topic text input (2-100 characters) with pre-configured suggestion shortcuts.
  * Loading state: *"Building your learning path..."* appears during AI generation.
  * Obvious CTA button: *"Build My Learning Path"* to trigger lesson generation.
* **Accessibility:** The persistent Accessibility Control panel must be immediately focusable and reachable from this page.

### Stage 2: Concept Introduction
* **Goal:** Introduce the dynamically generated concepts.
* **Concepts Covered:** Exactly 3 AI-generated foundational concepts mapping to the selected topic.
* **Content:** AI-generated plain language introduction with screen-reader narration Listen controls.

### Stage 3: Practice
* **Goal:** Test comprehension using a vetted multiple-choice question.
* **Evaluation:** Deterministic (handled by application logic).
* **Flow & State Transitions:**
  * **Correct Answer:**
    * Update learner state (record attempt, increment mastery level).
    * Clear any failure states.
    * Proceed directly to Stage 4 (Mission) or Stage 5. Recovery Mode must **not** activate.
  * **First Incorrect Attempt:**
    * Record attempt.
    * Increment incorrect count.
    * Transition state to display concise, encouraging, deterministic retry guidance.
    * Allow retry.
  * **Second Incorrect Attempt:**
    * Record attempt.
    * Detect meaningful struggle.
    * Trigger and activate **Recovery Mode** immediately.
* **Manual Trigger:** Learners can also manually activate Recovery Mode by clicking a button indicating they still do not understand.

---

## 2. Adaptive Recovery Engine
Triggered automatically after a second wrong answer or via manual request.

### Misconception Diagnosis
1. Request a real Gemini diagnosis of the learner's likely misconception (using the question, correct answer, learner answers, and relevant state).
2. The UI pauses with an accessible loading state.
3. Once diagnosed, display: *"Let's try a different way. You've tried this twice. Choose the explanation style that works best for you."*

### The Three Recovery Approaches
The learner is presented with three large, keyboard-accessible options of equal visual weight:
1. **Story:** A real-world analogy, scenario, or narrative explaining the concept.
2. **Visual:** A structured step-by-step visual explanation.
   * *A11y Constraint:* Must return structured data. The React UI renders this visually for sighted users and as a descriptive, educational screen-reader equivalent for non-sighted users. Never use generic alt text like "diagram".
3. **Memory:** A mnemonic, memory hook, shortcut, or concise recall technique.

The learner selects an approach, triggering a real Gemini request to generate the recovery content.

### Verification (Re-test)
* After presenting the recovery explanation, the system displays a related multiple-choice re-test.
* Evaluate the answer:
  * **Successful Recovery:** Boosts mastery, clears struggle flags.
  * **Failed Recovery:** Mastery remains low, registers weakness, persists struggle flag.
* Update knowledge state and transition to the Mission.

---

## 3. Learn-by-Doing Mission
* **Goal:** Prompt the learner to apply what they have learned in a mock real-world programming scenario.
* **Interface:** Clearly present the mission objective, starter code, a text area for the learner's code submission, and a submit button.
* **Evaluation:**
  * Submissions are sent to Gemini for evaluation against an explicit rubric.
  * The system receives a validated structured evaluation (feedback, score, correctness).
  * **Critical Rule:** Never execute learner-submitted Python code. Treat it strictly as text.
* **State Update:** Update the learner state with the mission outcome.

---

## 4. Next Best Action
* **Goal:** Direct the learner to their next logical learning activity.
* **Logic:** Takes the factual learner state (recent performance, recovery outcome, mission result) and sends a compact prompt to Gemini.
* **Output:** Gemini returns **exactly one** highly personalized learning recommendation (e.g., *"Practice parameter flow for 3 minutes,"* or *"Review return values"*), with a brief, clear rationale.
* **No Catalog:** Do not display a grid or list of options. The UI must cleanly focus on the single, recommended Next Best Action with a primary CTA: *"Continue Learning"*.
* Different learner performances must yield different recommendations.

---

## 5. Persistent Features

### Feature 4: Accessible Learning Modes
A persistent, keyboard-reachable accessibility configuration widget. Adjusting these settings must immediately apply changes, persist them in `localStorage`, and never interfere with or reset learning state.
* **Larger Text:** Scales up content text size cleanly without clipping or broken layouts.
* **High Contrast:** Swaps colors to a high-contrast palette.
* **Reduced Motion:** Disables non-essential CSS transitions, animations, and fade-ins.
* **Enhanced Focus:** Adds highly visible, thick, high-contrast focus rings around all active elements when navigated via keyboard.

### Feature 5: Read & Respond
* **Goal:** Enable users to hear key learning text.
* **Implementation:** Provide a clearly labeled *"Listen"* button for questions, feedback, recovery text, mission objectives, and the Next Best Action.
* **Speech Synthesis:** Genuinely use the native browser SpeechSynthesis API (`window.speechSynthesis`). If unsupported, cleanly hide/disable the control.
* **Controls:** Provide play/stop/pause actions. Do not autoplay audio. Do not block or interfere with screen-reader software.

---

## 6. Real Adaptation State Map (Downstream Effects)
The application state must dynamically react to learner paths:
```text
[First Wrong Answer]   → Increment attempts, trigger retry guidance
[Second Wrong Answer]  → Lock practice, call AI Misconception, display Recovery Options
[Story/Visual/Memory]  → Call AI Generator, display mode content
[Re-test Pass]        → Increase concept mastery, record recovery success
[Re-test Fail]        → Record weakness, keep mastery low, record recovery failure
[Mission Score]        → Adjust mastery level based on AI rubric evaluation
[Final State Evaluation] → Generates unique Next Best Action
```

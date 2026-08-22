# Permanent Engineering Rules

This document outlines the core principles and constraints that guide all engineering work on this codebase.

## Hackathon Principle
This is a time-sensitive hackathon MVP. Optimize for:
1. Problem alignment
2. Reliable adaptation
3. Functional AI
4. End-to-end functionality
5. Security
6. Accessibility
7. Testing
8. Performance
9. Visual polish

Never sacrifice working P0 functionality for optional features.

## Functional Integrity & No Fake Functionality
We never fake functionality.
* Never create static screens pretending something happened.
* Never present hardcoded output as dynamic learner output.
* Never present hardcoded content as AI-generated.
* Never fake Gemini responses or simulate successful API calls.
* Never create demo-only hidden states.
* Never require manual console manipulation or developer intervention during evaluator use.
* Never create controls that visually work but have no behavior.
* Hardcoded educational content (e.g. vetted questions, correct answers, lesson introductions, and mission templates) is allowed when clearly treated as authored educational content rather than AI-generated.
* Every completed feature must support:
  ```text
  Input → Processing → State Update → Output → Next Workflow Step
  ```

## Real AI
* Whenever the UI claims something was generated, diagnosed, evaluated, or recommended by AI, a real Gemini API request must have occurred.
* AI functionality must use relevant learner context.
* Never silently substitute fake AI output.

## Security
* **Never** expose `GEMINI_API_KEY` in frontend code.
* **Never** use `VITE_GEMINI_API_KEY`.
* **Never** commit secrets or API keys.
* All Gemini requests must go through a server-side Vercel Function.
* Treat learner input as untrusted.
* Treat Gemini output as untrusted; validate AI responses.
* Never execute learner-submitted Python code (treat code submission as text).
* Never render unsafe AI HTML; avoid `dangerouslySetInnerHTML`.
* Bound user input sizes.
* Do not log secrets or unnecessary learner content.

## Engineering Standards
* Preserve existing functionality; inspect before editing.
* Make the smallest complete change.
* Avoid unnecessary dependencies or unrelated refactoring.
* Prefer simple, readable architecture.
* Run relevant tests after meaningful changes.
* Run `npm run build` before declaring implementation work complete.

## Accessibility (A11y)
Accessibility is a core requirement, not a final patch. The entire core learning flow must work without a mouse.
* Support keyboard navigation (logical tab order, no keyboard traps, Enter/Space/Escape behaviors).
* Maintain visible focus indicators (Enhanced Focus Mode).
* Use semantic HTML elements first (avoid ARIA where native HTML works).
* Provide proper form labels and logical heading structures.
* Ensure sufficient color contrast.
* Announce dynamic state changes (errors, feedback, loading) appropriately for screen readers.
* Support reduced-motion preferences (`prefers-reduced-motion` and Reduced Motion Mode).
* Ensure fully responsive, mobile-first layouts so evaluator resizing does not break the interface.

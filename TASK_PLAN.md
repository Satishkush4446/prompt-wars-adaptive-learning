# Task Plan

Checklist for implementing the prompt-wars-adaptive-learning MVP.

## P0 — Core Adaptive Learning
* [x] Define learner state interfaces and TypeScript types.
* [x] Implement React reducer/state machine to track learning stages and history.
* [x] Track practice question attempts and counts.
* [x] Implement deterministic practice question evaluation.
* [x] Code mastery/state calculation logic.
* [x] Store and load learner progress to/from `localStorage`.
* [x] Build continuous learning screen transitions.
* [x] Build the two-failure threshold trigger for Recovery Mode.
* [x] Set up server-side Vercel serverless function (`/api/ai`).
* [x] Secure Gemini API key on the server-side (prevent frontend exposure).
* [x] Connect real Gemini misconception diagnosis (AI Action 1).
* [x] Connect real Gemini Story recovery generation (AI Action 2).
* [x] Connect real Gemini Visual recovery generation (AI Action 2).
* [x] Connect real Gemini Memory recovery generation (AI Action 2).
* [x] Implement the related recovery re-test.
* [x] Build the Learn-by-Doing Mission block.
* [x] Connect real Gemini mission evaluation (AI Action 3).
* [x] Update learner state based on mission outcomes.
* [x] Connect real Gemini Next Best Action recommendation (AI Action 4).
* [x] Verify that different learner behavior results in different AI actions and recommendations.
* [x] Add loading indicators, error boundaries, and retries for all AI connections.

## P0 — Accessibility
* [x] Make the entire learning flow fully keyboard usable (no mouse required).
* [x] Ensure semantic HTML tags and clean headers for screen-readers.
* [x] Expose dynamic feedback changes (correct/incorrect, AI loaders) to screen-readers.
* [x] Implement Larger Text Mode (resizes content correctly).
* [x] Implement High Contrast Mode (swaps theme stylesheets/variables).
* [x] Implement Reduced Motion Mode (removes transition timers).
* [x] Implement Enhanced Focus Mode (thick focus outlines on inputs/buttons).
* [x] Persist accessibility settings in `localStorage`.
* [x] Implement Listen functionality using the browser SpeechSynthesis API.
* [x] Ensure the Listen functionality does not autoplay.
* [x] Guarantee visual recovery step-by-step flows have full descriptive text equivalents.
* [x] Verify no states or evaluations communicate information using color alone.
* [x] Implement Dynamic Topic selection input on Welcome page.
* [x] Connect real Gemini generateLesson action to build topic path.
* [x] Support dynamic concepts states and updates in reducer.
* [x] Evaluate missions textually using dynamic rubrics without code execution.
* [x] Recommending dynamic concept Next Best Actions.
* [x] Persist dynamic topic path and progress under v2 storage schema.
* [x] Verify Vercel /api/ai endpoints run locally and pass validations.
* [x] Optional 5 / 10 / 20 / 30 minute personalization.
* [x] Skip time preference setting.
* [x] Time preference affects lesson depth and content detail.
* [x] Time preference affects mission task complexity.
* [x] Time setting creates zero additional Gemini calls.
* [x] Learn Overview concept sequence listing.
* [x] Initial Learning Mode selection stage.
* [x] Text learning modality.
* [x] Story learning modality.
* [x] Visual learning modality.
* [x] Visual accessible screen reader equivalents.
* [x] Memory learning modality.
* [x] Listen narration buttons integrated with initial modes.
* [x] Initial preference state is saved and persisted.
* [x] Viewing educational contents does not alter mastery level.
* [x] Initial mode is passed into struggle diagnosis context.
* [x] Struggle recovery recommends alternative presentation styles.
* [x] Dynamic coding topic works (e.g. Python Functions).
* [x] Dynamic non-coding topic works (e.g. Photosynthesis).
* [x] Complete adaptive learning journey verified.
* [x] Accessibility regression testing passed.
* [x] Free-text language input configuration view (defaulted to `"English"`).
* [x] Client/server validations enforcing length (2-50 chars), whitespace trimming, and control characters rejection.
* [x] Target learning language passed directly as untrusted DATA to serverless AI endpoints (zero extra calls).
* [x] AI instructions explicitly updated to protect against prompt injection, translating student-facing text while keeping schemas in English.
* [x] Dynamic SpeechSynthesis voice mapping by language name (fallback gracefully with warning alerts on unmapped languages).
* [x] Unit tests covering free-text language updates, storage validation, and resetting verified.

## P1 — Quality & Verification
* [x] Write unit tests for core algorithms.
* [x] Write tests for the state machine/reducer transitions.
* [x] Add schema validation tests for all Gemini JSON integrations.
* [x] Conduct end-to-end testing of the adaptive loop.
* [x] Audit accessibility checklist against WCAG AA standards.
* [x] Audit security (check for secrets exposure and input bounding).
* [x] Optimize API payloads to reduce token overhead.
* [x] Perform responsive design tests on mobile, tablet, and desktop viewports.
* [x] Apply Apple-inspired minimalist visual polish.
* [x] Create project README.md.
* [x] Clean up repository, ensuring no temporary files are tracked.
* [x] Deploy application on Vercel.
* [x] Verify production API keys and live endpoints.

## P2 — Polish
* [ ] Add subtle, accessible visual transitions (only if P0/P1 are fully complete).
* [ ] Conduct additional interface refinements.

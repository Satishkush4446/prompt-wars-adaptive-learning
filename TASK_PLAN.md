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
* [ ] Set up server-side Vercel serverless function (`/api/ai`).
* [ ] Secure Gemini API key on the server-side (prevent frontend exposure).
* [ ] Connect real Gemini misconception diagnosis (AI Action 1).
* [ ] Connect real Gemini Story recovery generation (AI Action 2).
* [ ] Connect real Gemini Visual recovery generation (AI Action 2).
* [ ] Connect real Gemini Memory recovery generation (AI Action 2).
* [x] Implement the related recovery re-test.
* [x] Build the Learn-by-Doing Mission block.
* [ ] Connect real Gemini mission evaluation (AI Action 3).
* [ ] Update learner state based on mission outcomes.
* [ ] Connect real Gemini Next Best Action recommendation (AI Action 4).
* [ ] Verify that different learner behavior results in different AI actions and recommendations.
* [ ] Add loading indicators, error boundaries, and retries for all AI connections.

## P0 — Accessibility
* [x] Make the entire learning flow fully keyboard usable (no mouse required).
* [x] Ensure semantic HTML tags and clean headers for screen-readers.
* [x] Expose dynamic feedback changes (correct/incorrect, AI loaders) to screen-readers.
* [x] Implement Larger Text Mode (resizes content correctly).
* [x] Implement High Contrast Mode (swaps theme stylesheets/variables).
* [x] Implement Reduced Motion Mode (removes transition timers).
* [x] Implement Enhanced Focus Mode (thick focus outlines on inputs/buttons).
* [x] Persist accessibility settings in `localStorage`.
* [ ] Implement Listen functionality using the browser SpeechSynthesis API.
* [ ] Ensure the Listen functionality does not autoplay.
* [x] Guarantee visual recovery step-by-step flows have full descriptive text equivalents.
* [x] Verify no states or evaluations communicate information using color alone.

## P1 — Quality & Verification
* [x] Write unit tests for core algorithms.
* [x] Write tests for the state machine/reducer transitions.
* [ ] Add schema validation tests for all Gemini JSON integrations.
* [ ] Conduct end-to-end testing of the adaptive loop.
* [ ] Audit accessibility checklist against WCAG AA standards.
* [ ] Audit security (check for secrets exposure and input bounding).
* [ ] Optimize API payloads to reduce token overhead.
* [ ] Perform responsive design tests on mobile, tablet, and desktop viewports.
* [ ] Apply Apple-inspired minimalist visual polish.
* [ ] Create project README.md.
* [ ] Clean up repository, ensuring no temporary files are tracked.
* [ ] Deploy application on Vercel.
* [ ] Verify production API keys and live endpoints.

## P2 — Polish
* [ ] Add subtle, accessible visual transitions (only if P0/P1 are fully complete).
* [ ] Conduct additional interface refinements.

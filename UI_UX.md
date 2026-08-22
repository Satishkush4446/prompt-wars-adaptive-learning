# UI/UX Specifications

This document outlines the visual style, interaction rules, and accessibility standards for the application.

## 1. Visual Direction & Aesthetic

### The "Apple-Inspired" Minimalist Philosophy
Our design favors exceptional simplicity, generous white space, and clear focus.
* **Layouts:** Large, centered reading blocks with ample breathing room. Focus on a single central card per screen.
* **Typography:** Large, confident headlines with strong weight contrast. System font stack by default.
* **Gradients:** Restrained. Use a single subtle gradient (e.g., `soft blue → violet → subtle cyan`) sparingly, to draw focus to active recovery states, select buttons, and primary call-to-actions.
* **Surfaces:** Soft neutral white/gray backgrounds, subtle rounded borders, and soft shadows to create clean elevation. Minimal visual noise.
* *Constraint:* Never use Apple logos, trademarks, copyrighted branding, or asset mockups. The goal is to capture the premium design philosophy, not copy the brand.

### Product Feeling
* **Should Feel Like:** Premium, calm, intelligent, accessible, focused, AI-native.
* **Should NOT Feel Like:** A bloated school LMS, corporate training portal, children's game, or basic template dashboard.

### Color System
* **Backgrounds:** Pure white (`#ffffff`) or near-white (`#fafafa`, `#f5f5f7`).
* **Typography:** Near-black / dark charcoal (`#1d1d1f`, `#212529`).
* **Accents:** Restrained indigo/blue/violet gradient for CTA, active focus state, and Recovery mode indicators.
* **Feedback Colors:** Use soft, desaturated greens/reds for correct/incorrect answers, accompanied by clear text icons (not relying purely on color for status).

---

## 2. Core Screens & Components

### A. Welcome Screen
* **Hero Messaging:** *"Learning that adapts when you need it most."*
* **Supporting Messaging:** *"We notice where you're struggling, change the approach, and guide your next step."*
* **Primary Action:** Large, elegant button: *"Start Learning"*.
* **Layout:** Centered, minimal, uncluttered.

### A1. Language Selection Screen
* **Hero Messaging:** *"Choose the language you're most comfortable learning in."*
* **Supporting Messaging:** *"Explanations, practice questions, and missions will be tailored to this language."*
* **Primary Options:** Free-text input field (pre-filled with `"English"`, maximum 50 characters, minimum 2 characters).
* **A11y:** Toggling set elements dynamically resolves BCP-47 locale tags to update the document `lang` attribute for native screen reader pronunciation. Narration buttons map voice locales appropriately, or gracefully fall back to displaying a disabled warning notice if no speech locale is resolvable.
* **Layout:** Centered card with clean validation warning indicators.

### B. Practice Screen
* **Focus:** The question must be the clear hero element.
* **Interface:**
  * Clean question text in a highly readable format.
  * Simple, spacious radio options or select cards.
  * Single primary button: *"Submit Answer"*.
  * Feedback message box (dynamic and screen-reader accessible).

### C. Recovery Mode (Hero Moment)
* **Visual Cue:** Shift from normal learning card to a distinct card highlighted with a subtle accent gradient border.
* **Messaging:**
  * Headline: *"Let's try a different way."*
  * Description: *"You've tried this twice. Choose the explanation style that works best for you."*
* **Options:** Three equal cards (Story, Visual, Memory) with descriptive icons and clear hover/focus states. Fully keyboard navigable.
* **Content Layout:**
  * Title
  * Short explanation
  * Mode-specific recovery (Story narrative / Visual flow block / Memory mnemonic)
  * Key takeaway statement
  * CTA: *"Try Re-test"*

### D. Mission Screen
* **Headline:** *"Mission unlocked."*
* **Interface:**
  * High-contrast text block outlining the objective.
  * Authored starter code.
  * Accessible `<textarea>` for code input with clear visual borders.
  * Primary Action: *"Submit Solution"*.
  * Accessible status region displaying AI evaluation loader or results.

### E. Next Best Action Screen
* **Headline:** *"Your next best step"*
* **Interface:**
  * One single recommendation presented with confident typography.
  * A concise, 1-sentence reasoning statement below.
  * Primary Action: *"Continue Learning"*.

---

## 3. Interaction & Accessibility (A11y)

### Persistent Accessibility Settings Panel
A compact accessibility dashboard must be persistently present throughout the experience:
* **Larger Text Mode:** Dynamically scales content text sizes without breaking grid lines or causing overflow.
* **High Contrast Mode:** Switches to high-contrast colors (meeting WCAG AAA standards).
* **Reduced Motion Mode:** Disables page slide transitions, fades, and pulse animations.
* **Enhanced Focus Mode:** Reinforces active focus indicators (thick, high-contrast rings around links/inputs).

### Screen Reader Support
* Use logical heading structure (`<h1>` strictly once per page, descending hierarchically).
* Dynamic state changes (like evaluation results, AI loading, and new recommendations) must be announced using semantic ARIA live regions (`role="status"` or `aria-live="polite"`).
* Avoid excessive repeated announcements.
* Ensure visual steps in Visual Recovery Mode expose text-equivalent descriptions via hidden elements or `aria-describedby` links.

### Keyboard & Motion
* Ensure a logical tab flow. No keyboard traps.
* Use native HTML elements (`<button>`, `<input>`, `<fieldset>`) so screen readers natively understand actions.
* Limit CSS motion to gentle fade-ins and subtle height transitions. Disable them when `prefers-reduced-motion` is active or Reduced Motion Mode is toggled on.

### Responsive Design
* Design mobile-first. Cards, forms, and accessibility controls must wrap and stack cleanly.
* Evaluator viewport resizing must not distort text or overlap interactive components.

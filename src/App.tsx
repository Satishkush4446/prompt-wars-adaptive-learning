import { useReducer, useEffect, useState, useRef } from "react";
import { learnerReducer } from "./state/learnerReducer";
import { initialLearnerState } from "./state/initialState";
import { loadLearnerState, saveLearnerState } from "./lib/storage";
import {
  diagnoseMisconception,
  generateRecovery,
  evaluateMission,
  getNextBestAction,
  generateLesson
} from "./lib/aiClient";
import type { RecoveryMode as RecoveryModeType, LearningDuration, LearningMode } from "./state/learnerTypes";
import { resolveSpeechLocale } from "./hooks/useSpeechSynthesis";

import LearnerStateCard from "./components/LearnerStateCard";
import QuestionCard from "./components/QuestionCard";
import RecoveryMode from "./components/RecoveryMode";
import RecoveryContent from "./components/RecoveryContent";
import MissionCard from "./components/MissionCard";
import NextActionCard from "./components/NextActionCard";
import ListenButton from "./components/ListenButton";

import "./App.css";

function App() {
  const [state, dispatch] = useReducer(learnerReducer, initialLearnerState, () => {
    return loadLearnerState();
  });

  const [showA11yMenu, setShowA11yMenu] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [topicText, setTopicText] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<LearningDuration | null>(null);

  const [langInput, setLangInput] = useState<string>("English");
  const [langError, setLangError] = useState<string | null>(null);

  const a11yButtonRef = useRef<HTMLButtonElement>(null);
  const a11yMenuRef = useRef<HTMLDivElement>(null);

  const resolvedLocale = resolveSpeechLocale(state.learningLanguage);
  const resolvedHTMLCode = resolvedLocale ? resolvedLocale.split("-")[0] : "en";

  // Sync state to localStorage
  useEffect(() => {
    saveLearnerState(state);
  }, [state]);

  // Sync langInput on phase transitions
  useEffect(() => {
    if (state.phase === "languagePreference") {
      setLangInput(state.learningLanguage || "English");
      setLangError(null);
    }
  }, [state.phase, state.learningLanguage]);

  // Apply HTML lang attribute
  useEffect(() => {
    document.documentElement.setAttribute("lang", resolvedHTMLCode);
  }, [resolvedHTMLCode]);

  // Apply accessibility classes to root HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (state.accessibility.largeText) root.classList.add("large-text");
    else root.classList.remove("large-text");

    if (state.accessibility.highContrast) root.classList.add("high-contrast");
    else root.classList.remove("high-contrast");

    if (state.accessibility.reducedMotion) root.classList.add("reduced-motion");
    else root.classList.remove("reduced-motion");

    if (state.accessibility.enhancedFocus) root.classList.add("enhanced-focus");
    else root.classList.remove("enhanced-focus");
  }, [state.accessibility]);

  // Accessibility popover trap and Escape closing
  useEffect(() => {
    if (showA11yMenu) {
      const firstItem = a11yMenuRef.current?.querySelector("button");
      if (firstItem instanceof HTMLElement) {
        firstItem.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowA11yMenu(false);
          a11yButtonRef.current?.focus();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showA11yMenu]);

  // Stop narration on phase change
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [state.phase]);

  // Re-test state variables
  const [selectedRetestOption, setSelectedRetestOption] = useState<string>("");
  const [retestSubmitted, setRetestSubmitted] = useState<boolean>(false);

  // Dynamic retest variables
  const dynamicQuestion = state.recovery.recoveryContent?.reTestQuestion;
  const retestQuestionText = dynamicQuestion?.question || "Re-test verification question";
  const retestOptionsList = dynamicQuestion?.options || [];

  const handleRetestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetestOption) return;

    let correct = false;
    if (dynamicQuestion) {
      const correctIdx = dynamicQuestion.correctOptionIndex;
      const correctOptionText = dynamicQuestion.options[correctIdx];
      correct = selectedRetestOption === correctOptionText;
    }

    dispatch({
      type: "SUBMIT_RETEST",
      payload: {
        questionId: "qr_dynamic",
        concept: state.currentConcept,
        answer: selectedRetestOption,
        correct,
      },
    });
    setRetestSubmitted(true);
  };

  const handleRetestReset = () => {
    setSelectedRetestOption("");
    setRetestSubmitted(false);
  };

  // Welcome Topic Input Submit
  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = topicText.trim();
    if (finalTopic.length < 2 || finalTopic.length > 100) {
      setInputError("Topic must be between 2 and 100 characters.");
      return;
    }
    setInputError(null);
    dispatch({ type: "SET_TOPIC_SUBMIT", payload: { topicInput: finalTopic } });
  };

  // Language Selection Form Submit
  const handleLangSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = langInput.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setLangError("Language must be between 2 and 50 characters.");
      return;
    }
    const controlCharsRegex = /[\u0000-\u001F\u007F-\u009F]/;
    if (controlCharsRegex.test(langInput)) {
      setLangError("Language must not contain control characters.");
      return;
    }
    setLangError(null);
    dispatch({ type: "SET_LANGUAGE_PREFERENCE", payload: { language: trimmed } });
  };

  // Lesson Generation trigger
  const handleBuildLesson = async (durationVal: LearningDuration | null) => {
    setApiError(null);
    dispatch({ type: "SET_TIME_PREFERENCE", payload: { duration: durationVal } });
    dispatch({ type: "START_LESSON_GENERATION" });

    try {
      const lesson = await generateLesson({ 
        topic: state.topicInput, 
        learningDurationMinutes: durationVal,
        learningLanguage: state.learningLanguage
      });
      dispatch({ type: "SET_GENERATED_LESSON", payload: { lesson } });
    } catch (error: any) {
      console.error("Lesson generation failed:", error);
      dispatch({ type: "LESSON_GENERATION_ERROR" });
      setApiError(error.message || "Failed to generate lesson path. Please try again.");
    }
  };

  // 1. Real Misconception Diagnosis Workflow
  useEffect(() => {
    const lesson = state.lesson;
    if (state.phase === "recoveryDiagnosis" && state.recovery.diagnosisStatus === "idle" && lesson) {
      const runDiagnosis = async () => {
        dispatch({ type: "START_RECOVERY_DIAGNOSIS" });
        setApiError(null);
        try {
          const wrongAnswers = state.attempts
            .filter(a => a.concept === state.currentConcept && !a.correct)
            .map(a => a.answer);

          const result = await diagnoseMisconception({
            topic: lesson.topicTitle,
            concept: state.currentConcept,
            question: lesson.initialQuestion.prompt,
            correctAnswer: lesson.initialQuestion.correctAnswer,
            learnerAnswers: wrongAnswers,
            attemptCount: wrongAnswers.length,
            mastery: state.concepts[state.currentConcept]?.mastery || 0,
            recoveryHistory: [],
            initialLearningMode: state.initialLearningMode,
            learningLanguage: state.learningLanguage
          });

          dispatch({
            type: "SET_RECOVERY_DIAGNOSIS",
            payload: {
              misconception: result.misconception,
              recommendedMode: result.recommendedMode
            }
          });
        } catch (error: any) {
          console.error("Diagnosis request failed:", error);
          dispatch({ type: "RECOVERY_DIAGNOSIS_ERROR" });
          setApiError(error.message || "Failed to diagnose misconception.");
        }
      };
      runDiagnosis();
    }
  }, [state.phase, state.recovery.diagnosisStatus, state.currentConcept, state.attempts, state.lesson, state.initialLearningMode, state.learningLanguage]);

  // 2. Real Recovery Content Selection & Generation
  const handleSelectMode = async (selectedMode: RecoveryModeType) => {
    if (!state.lesson) return;
    dispatch({ type: "SELECT_RECOVERY_MODE", payload: { selectedMode } });
    dispatch({ type: "START_RECOVERY_CONTENT" });
    setApiError(null);

    try {
      const wrongAnswers = state.attempts
        .filter(a => a.concept === state.currentConcept && !a.correct)
        .map(a => a.answer);

      const content = await generateRecovery({
        topic: state.lesson.topicTitle,
        concept: state.currentConcept,
        question: state.lesson.initialQuestion.prompt,
        learnerAnswers: wrongAnswers,
        misconception: state.recovery.misconception || "Struggling with conceptual workflow basics",
        mastery: state.concepts[state.currentConcept]?.mastery || 0,
        selectedMode,
        learningLanguage: state.learningLanguage
      });

      // Visual Mode verification: MUST include non-empty accessibleExplanation
      if (selectedMode === "visual") {
        const visualData = content as any;
        if (!visualData.accessibleExplanation || visualData.accessibleExplanation.trim().length === 0) {
          throw new Error("Visual representation generated is missing an accessible explanation.");
        }
      }

      dispatch({
        type: "SET_RECOVERY_CONTENT_SUCCESS",
        payload: { recoveryContent: content }
      });
    } catch (error: any) {
      console.error("Recovery generation failed:", error);
      dispatch({ type: "RECOVERY_CONTENT_ERROR" });
      setApiError(error.message || "Failed to generate recovery explanation.");
    }
  };

  // 3. Real Mission Evaluation
  const handleEvaluateMission = async () => {
    if (!state.lesson) return;
    dispatch({ type: "START_MISSION_EVALUATION" });
    setApiError(null);
    try {
      const evaluation = await evaluateMission({
        topic: state.lesson.topicTitle,
        concept: state.currentConcept,
        missionGoal: state.lesson.mission.goal,
        rubric: state.lesson.mission.rubric,
        learnerSubmission: state.mission.submission,
        learnerState: state,
        learningLanguage: state.learningLanguage
      });

      let finalWeakness = null;
      if (evaluation.weakness && evaluation.weakness !== "none" && state.concepts[evaluation.weakness]) {
        finalWeakness = evaluation.weakness;
      }

      dispatch({
        type: "SET_MISSION_RESULT",
        payload: {
          passed: evaluation.passed,
          feedback: evaluation.feedback,
          weakness: finalWeakness
        }
      });
    } catch (error: any) {
      console.error("Mission evaluation failed:", error);
      dispatch({ type: "MISSION_EVALUATION_ERROR" });
      setApiError(error.message || "Failed to evaluate mission.");
    }
  };

  // 4. Real Next Best Action Generation
  const handleGetNextAction = async () => {
    dispatch({ type: "START_NEXT_ACTION" });
    setApiError(null);
    try {
      const wrongAttempts = state.attempts.filter(a => !a.correct);
      const recommendation = await getNextBestAction({
        concepts: state.concepts,
        recentAttempts: wrongAttempts.map(a => ({ concept: a.concept, correct: a.correct, answer: a.answer })),
        recoveryResult: state.recovery.recovered,
        recoveryMode: state.recovery.selectedMode,
        missionResult: state.mission.passed,
        missionWeakness: state.mission.weakness,
        hintUsed: state.mission.hintUsed,
        learningDurationMinutes: state.learningDurationMinutes,
        learningLanguage: state.learningLanguage
      });

      let finalRec = recommendation;
      if (!state.concepts[recommendation.concept]) {
        const firstConceptId = Object.keys(state.concepts)[0];
        finalRec = { ...recommendation, concept: firstConceptId };
      }

      dispatch({
        type: "SET_NEXT_ACTION",
        payload: { nextAction: finalRec }
      });
    } catch (error: any) {
      console.error("Next action request failed:", error);
      dispatch({ type: "NEXT_ACTION_ERROR" });
      setApiError(error.message || "Failed to determine next best action.");
    }
  };

  // Map phases to progress indicator
  const getProgressStage = (): "Learn" | "Practice" | "Recover" | "Apply" | "Guide" => {
    const { phase } = state;
    if (
      phase === "welcome" ||
      phase === "languagePreference" ||
      phase === "timePreference" ||
      phase === "intro" ||
      phase === "learningModeSelection" ||
      phase === "initialLearningContent"
    ) {
      return "Learn";
    }
    if (phase === "practice") return "Practice";
    if (
      phase === "recoveryDiagnosis" ||
      phase === "recoverySelection" ||
      phase === "recoveryContent" ||
      phase === "retest"
    ) {
      return "Recover";
    }
    if (phase === "mission" || phase === "missionResult") return "Apply";
    return "Guide";
  };

  const currentProgressStage = getProgressStage();

  const toggleA11y = (key: "largeText" | "highContrast" | "reducedMotion" | "enhancedFocus") => {
    dispatch({
      type: "SET_ACCESSIBILITY_PREFERENCE",
      payload: {
        key,
        value: !state.accessibility[key],
      },
    });
  };

  // Pre-configured mock triggers for developer checks
  const handleMockDiagnosis = (mode: RecoveryModeType) => {
    dispatch({ type: "START_RECOVERY_DIAGNOSIS" });
    setTimeout(() => {
      dispatch({
        type: "SET_RECOVERY_DIAGNOSIS",
        payload: {
          misconception: "Learner is confusing variable references with structural parameter inputs.",
          recommendedMode: mode,
        },
      });
    }, 600);
  };

  const handleMockRecoveryContent = (mode: RecoveryModeType) => {
    dispatch({ type: "START_RECOVERY_CONTENT" });
    const mockContent = {
      mode: mode,
      title: `Tailored Explanation (${mode.toUpperCase()})`,
      keyTakeaway: "Variables are named slots updated at trigger time.",
      reTestQuestion: {
        question: "Select the correctly formatted answer option.",
        options: ["First Choice", "Second Choice", "Third Choice", "Fourth Choice"],
        correctOptionIndex: 1
      },
      ...(mode === "story" ? {
        story: "Think of named parameters like blank address slots on a envelope.",
        connection: "When executing the mail delivery, slots are populated with values."
      } : mode === "memory" ? {
        hook: "SLOTS",
        meaning: "Slots Logically Organize User Inputs Safely.",
        example: "def envelope(address): address slots parameter."
      } : {
        steps: [{ label: "Address Input", value: "address = 'Paris'", explanation: "Addresses envelopes" }],
        accessibleExplanation: "Visual diagram representing mail envelope slot assignment."
      })
    };

    setTimeout(() => {
      dispatch({ 
        type: "SET_RECOVERY_CONTENT_SUCCESS", 
        payload: { recoveryContent: mockContent } 
      });
    }, 600);
  };

  // Speech Builders
  const getIntroSpeech = () => {
    if (!state.lesson) return "";
    const conceptTexts = state.lesson.concepts.map(c => `${c.name}: ${c.description}`).join(". ");
    return `Topic: ${state.lesson.topicTitle}. Introduction: ${state.lesson.intro}. Concepts covered: ${conceptTexts}`;
  };

  const getRetestSpeech = () => {
    return `${retestQuestionText}. Options: ${retestOptionsList.join(", ")}`;
  };

  const getModeContent = () => {
    if (!state.lesson || !state.initialLearningMode) return null;
    const currentConceptObj = state.lesson.concepts.find(c => c.id === state.currentConcept);
    if (!currentConceptObj) return null;
    return currentConceptObj.learningModes[state.initialLearningMode];
  };

  const selectedContent = getModeContent();

  const getModeSpeech = () => {
    if (!selectedContent || !state.initialLearningMode) return "";
    if (state.initialLearningMode === "text") {
      const textVal = selectedContent as any;
      return `Explanation: ${textVal.explanation}. Example: ${textVal.example}. Remember: ${textVal.keyTakeaway}`;
    }
    if (state.initialLearningMode === "story") {
      const storyVal = selectedContent as any;
      return `Story Title: ${storyVal.title}. Story: ${storyVal.story}. Connection: ${storyVal.connection}. Remember: ${storyVal.keyTakeaway}`;
    }
    if (state.initialLearningMode === "visual") {
      const visualVal = selectedContent as any;
      return `Visual Title: ${visualVal.title}. Accessible Explanation: ${visualVal.accessibleExplanation}. Remember: ${visualVal.keyTakeaway}`;
    }
    if (state.initialLearningMode === "memory") {
      const memoryVal = selectedContent as any;
      return `Mnemonic Hook: ${memoryVal.hook}. Meaning: ${memoryVal.meaning}. Example: ${memoryVal.example}. Remember: ${memoryVal.keyTakeaway}`;
    }
    return "";
  };

  return (
    <div className="app-container" lang={resolvedHTMLCode}>
      {/* Persistent App Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-logo" aria-hidden="true">⇄</span>
          <h1>ADAPTIQ <span className="brand-sub">Adaptive Learning Intelligence</span></h1>
        </div>

        <div className="header-actions">
          <button
            ref={a11yButtonRef}
            type="button"
            className="btn btn-secondary a11y-toggle"
            aria-expanded={showA11yMenu}
            aria-haspopup="true"
            onClick={() => setShowA11yMenu(!showA11yMenu)}
          >
            ♿ Accessibility Settings
          </button>

          {showA11yMenu && (
            <div 
              ref={a11yMenuRef}
              className="a11y-dropdown" 
              role="dialog"
              aria-label="Accessibility modifier preferences menu"
            >
              <div className="a11y-dropdown-header">Visual & Interaction Modes</div>
              
              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.largeText}
                className={`a11y-dropdown-item ${state.accessibility.largeText ? "checked" : ""}`}
                onClick={() => toggleA11y("largeText")}
              >
                <span>Larger Text</span>
                <span className="checkbox-indicator">{state.accessibility.largeText ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.highContrast}
                className={`a11y-dropdown-item ${state.accessibility.highContrast ? "checked" : ""}`}
                onClick={() => toggleA11y("highContrast")}
              >
                <span>High Contrast</span>
                <span className="checkbox-indicator">{state.accessibility.highContrast ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.reducedMotion}
                className={`a11y-dropdown-item ${state.accessibility.reducedMotion ? "checked" : ""}`}
                onClick={() => toggleA11y("reducedMotion")}
              >
                <span>Reduced Motion</span>
                <span className="checkbox-indicator">{state.accessibility.reducedMotion ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                role="checkbox"
                aria-checked={state.accessibility.enhancedFocus}
                className={`a11y-dropdown-item ${state.accessibility.enhancedFocus ? "checked" : ""}`}
                onClick={() => toggleA11y("enhancedFocus")}
              >
                <span>Enhanced Focus Ring</span>
                <span className="checkbox-indicator">{state.accessibility.enhancedFocus ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm mt-4 w-full"
                onClick={() => setShowA11yMenu(false)}
              >
                Close Menu
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Progress Journey Indicator */}
      <nav className="progress-nav" aria-label="Learning Stage Progress Indicator">
        <ul className="progress-stages">
          {(["Learn", "Practice", "Recover", "Apply", "Guide"] as const).map((stage) => {
            const isActive = currentProgressStage === stage;
            return (
              <li 
                key={stage} 
                className={`stage-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="stage-dot" />
                <span className="stage-name">
                  {isActive ? `Current: ${stage}` : stage}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Persistent Learner State Card Summary */}
      <div className="state-card-container">
        <LearnerStateCard state={state} />
      </div>

      {/* Main Experience Container */}
      <main className="main-content">
        
        {/* Stage 1: Welcome Topic Entry */}
        {state.phase === "welcome" && (
          <div className="welcome-stage centered-card">
            <div className="brand-hero text-center mb-6">
              <span className="brand-badge-premium">ADAPTIQ</span>
              <h2 className="welcome-headline-premium">Learn differently.<br/>Improve intelligently.</h2>
              <p className="welcome-subtitle-premium">Adaptive Learning Intelligence</p>
              <p className="welcome-desc mt-4">
                AdaptiQ learns how you learn. When you struggle, it changes the way a concept is taught and guides you toward what to do next.
              </p>
              <div className="branding-philosophy mt-4 text-xs font-mono text-secondary">
                Personalization tells us how to start. &bull; Performance tells us how to adapt.
              </div>
            </div>

            <div className="divider-subtle my-6" />

            <h3 className="section-label-premium">What do you want to learn?</h3>

            <form onSubmit={handleTopicSubmit} className="topic-input-form mt-4 w-full max-w-lg">
              <div className="form-group flex flex-col gap-2 text-left">
                <label htmlFor="topic-input-field" className="topic-input-label font-bold">
                  Target Topic
                </label>
                <input
                  id="topic-input-field"
                  type="text"
                  className="topic-text-input"
                  placeholder="e.g. Fractions, Photosynthesis, Python Functions..."
                  value={topicText}
                  onChange={(e) => setTopicText(e.target.value)}
                  maxLength={100}
                  required
                />
                {inputError && (
                  <p className="error-text text-danger text-sm mt-1" role="alert">
                    ⚠️ {inputError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large w-full mt-6"
              >
                Continue
              </button>
            </form>

            <div className="suggested-topics-container mt-6">
              <span className="suggested-label text-sm font-semibold">Suggested Topics:</span>
              <div className="suggestions-list flex gap-2 mt-2 justify-center">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm suggestion-tag-btn"
                  onClick={() => { setTopicText("Python Functions"); dispatch({ type: "SET_TOPIC_SUBMIT", payload: { topicInput: "Python Functions" } }); }}
                >
                  Python Functions
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm suggestion-tag-btn"
                  onClick={() => { setTopicText("Photosynthesis"); dispatch({ type: "SET_TOPIC_SUBMIT", payload: { topicInput: "Photosynthesis" } }); }}
                >
                  Photosynthesis
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm suggestion-tag-btn"
                  onClick={() => { setTopicText("Fractions"); dispatch({ type: "SET_TOPIC_SUBMIT", payload: { topicInput: "Fractions" } }); }}
                >
                  Fractions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 1a: Optional Language Selection (Free-Text Input) */}
        {state.phase === "languagePreference" && (
          <div className="language-stage centered-card">
            <h2 className="welcome-headline">Choose the language you're most comfortable learning in.</h2>
            <p className="welcome-desc">
              Explanations, practice questions, and missions will be tailored to this language.
            </p>

            <form onSubmit={handleLangSubmit} className="language-input-form mt-6 w-full max-w-lg">
              <div className="form-group flex flex-col gap-2 text-left">
                <label htmlFor="language-input-field" className="topic-input-label font-bold">
                  Learning Language
                </label>
                <input
                  id="language-input-field"
                  type="text"
                  className="topic-text-input"
                  placeholder="e.g. English, Spanish, Hindi, Tamil..."
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  maxLength={50}
                  required
                />
                <p className="helper-text text-secondary text-xs mt-1">
                  Examples: English, Spanish, Hindi, Tamil, Arabic, Japanese...
                </p>
                {langError && (
                  <p className="error-text text-danger text-sm mt-1" role="alert">
                    ⚠️ {langError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large w-full mt-6"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {/* Stage 1b: Optional Time Preference Selection */}
        {state.phase === "timePreference" && (
          <div className="time-stage centered-card">
            {state.lessonStatus === "loading" ? (
              <div className="status-loading-spinner" role="status" aria-live="polite">
                <p className="loading-text text-xl font-bold">Building your learning path…</p>
                <p className="loading-sub text-sm">Please wait while Gemini creates your curriculum.</p>
              </div>
            ) : (
              <>
                <h2 className="welcome-headline">How much time do you have?</h2>
                <p className="welcome-desc">
                  We'll shape this learning session around your available time.
                </p>

                {apiError && (
                  <div className="error-alert w-full max-w-lg mt-4" role="alert">
                    <p className="error-msg">⚠️ We couldn't build your learning path right now.</p>
                    <p className="error-detail text-sm mt-1">{apiError}</p>
                  </div>
                )}

                <div className="time-options-grid mt-6 w-full max-w-lg">
                  <fieldset className="options-fieldset w-full">
                    <legend className="sr-only">Choose available time preference option</legend>
                    <div className="flex flex-col gap-3">
                      {[
                        { val: 5, label: "5 minutes", desc: "Quick overview" },
                        { val: 10, label: "10 minutes", desc: "Focused learning" },
                        { val: 20, label: "20 minutes", desc: "Deeper practice" },
                        { val: 30, label: "30 minutes", desc: "Full learning session" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          className={`option-label text-left justify-between ${selectedDuration === opt.val ? "selected" : ""}`}
                          onClick={() => setSelectedDuration(opt.val as LearningDuration)}
                        >
                          <span className="flex flex-col">
                            <span className="font-bold text-base">{opt.label}</span>
                            <span className="text-secondary text-xs">{opt.desc}</span>
                          </span>
                          <span className="checkbox-indicator font-bold text-lg">
                            {selectedDuration === opt.val ? "✓" : ""}
                          </span>
                        </button>
                      ))}

                      <button
                        type="button"
                        className={`option-label text-left justify-between ${selectedDuration === null ? "selected" : ""}`}
                        onClick={() => setSelectedDuration(null)}
                      >
                        <span className="flex flex-col">
                          <span className="font-bold text-base">Skip</span>
                          <span className="text-secondary text-xs">No time preference</span>
                        </span>
                        <span className="checkbox-indicator font-bold text-lg">
                          {selectedDuration === null ? "✓" : ""}
                        </span>
                      </button>
                    </div>
                  </fieldset>
                </div>

                <div className="button-group w-full max-w-lg mt-8">
                  <button
                    type="button"
                    className="btn btn-primary btn-large w-full"
                    onClick={() => handleBuildLesson(selectedDuration)}
                  >
                    Build Learning Path
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stage 2: Lesson Path Overview */}
        {state.phase === "intro" && state.lesson && (
          <div className="intro-stage learning-card">
            <div className="card-header">
              <div className="header-badges">
                <span className="card-badge">Lesson Path Overview</span>
                {state.learningDurationMinutes && (
                  <span className="duration-pill ml-2 text-xs bg-slate-200 px-2 py-1 rounded">
                    ⏰ {state.learningDurationMinutes}-minute session
                  </span>
                )}
              </div>
              <ListenButton text={getIntroSpeech()} lang={state.learningLanguage} />
            </div>
            
            <h2 className="intro-title">{state.lesson.topicTitle}</h2>
            <div className="intro-explanation mt-4">
              <p>{state.lesson.intro}</p>
              
              <h3 className="intro-concepts-header mt-6 font-bold text-lg uppercase tracking-wider text-secondary">Your Path:</h3>
              <ol className="intro-flow-list mt-2">
                {state.lesson.concepts.map((concept, idx) => (
                  <li key={concept.id} className={`concept-intro-item py-2 ${idx === 0 ? "text-primary font-semibold" : "text-secondary"}`}>
                    <span className="concept-index-num mr-2">{idx + 1}.</span>
                    <strong>{concept.name}:</strong> {concept.description}
                  </li>
                ))}
              </ol>
            </div>

            <div className="highlighted-concept-box mt-6 p-4 border rounded bg-slate-50">
              <span className="concept-tag text-xs font-bold text-accent-blue uppercase">Starting Concept:</span>
              <h4 className="font-bold text-lg mt-1">{state.lesson.concepts[0]?.name}</h4>
              <p className="text-secondary text-sm mt-1">{state.lesson.concepts[0]?.description}</p>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-8"
              onClick={() => dispatch({ type: "GO_TO_MODE_SELECTION" })}
            >
              Choose how to learn
            </button>
          </div>
        )}

        {/* Stage 2b: Initial Learning Mode Selection */}
        {state.phase === "learningModeSelection" && state.lesson && (
          <div className="learning-card">
            <div className="card-header">
              <span className="card-badge">Preference Selection</span>
            </div>

            <h3 className="intro-title">Choose how you want to learn</h3>
            <p className="welcome-desc mt-2 text-sm">
              Start with the approach that works best for you. If you get stuck, we'll help you try a different one.
            </p>

            <div className="options-list mt-6">
              <fieldset className="options-fieldset w-full">
                <legend className="sr-only">Select your initial presentation modality preference</legend>
                <div className="flex flex-col gap-3">
                  {[
                    { mode: "text", title: "Text Mode", desc: "Give me a clear explanation." },
                    { mode: "story", title: "Story Mode", desc: "Teach me through an analogy or story." },
                    { mode: "visual", title: "Visual Mode", desc: "Show me how the idea works step by step." },
                    { mode: "memory", title: "Memory Mode", desc: "Give me a simple way to remember it." },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      className="option-label text-left justify-between"
                      onClick={() => dispatch({ type: "SET_INITIAL_LEARNING_MODE", payload: { mode: item.mode as LearningMode } })}
                    >
                      <span className="flex flex-col">
                        <span className="font-bold text-base">{item.title}</span>
                        <span className="text-secondary text-sm">{item.desc}</span>
                      </span>
                      <span className="arrow-indicator font-bold text-lg">→</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {/* Stage 2c: Initial Learning Mode Content Display */}
        {state.phase === "initialLearningContent" && state.lesson && state.initialLearningMode && selectedContent && (
          <div className="learning-card">
            <div className="card-header">
              <span className="card-badge uppercase">Learning Content ({state.initialLearningMode})</span>
              <ListenButton text={getModeSpeech()} lang={state.learningLanguage} />
            </div>

            {state.initialLearningMode === "text" && (
              <div className="text-mode-layout">
                <h3 className="recovery-content-title">Concept Explanation</h3>
                <div className="explanation-paragraph mt-4">
                  <p>{(selectedContent as any).explanation}</p>
                </div>

                <div className="example-block-layout mt-6">
                  <h4 className="font-bold">💻 Code / Context Example:</h4>
                  <pre className="code-block mt-2">
                    <code>{(selectedContent as any).example}</code>
                  </pre>
                </div>

                <div className="takeaway-box mt-6">
                  <strong>Key Takeaway:</strong> {(selectedContent as any).keyTakeaway}
                </div>
              </div>
            )}

            {state.initialLearningMode === "story" && (
              <div className="story-mode-layout">
                <h3 className="recovery-content-title">{(selectedContent as any).title}</h3>
                
                <div className="story-box-layout mt-4 p-4 border rounded bg-violet-50">
                  <h4 className="story-subtitle">📖 The Analogy:</h4>
                  <p className="story-text mt-2">{(selectedContent as any).story}</p>
                </div>

                <div className="story-connection-layout mt-6">
                  <h4 className="font-bold">💡 How this connects to the concept:</h4>
                  <p className="connection-text mt-2">{(selectedContent as any).connection}</p>
                </div>

                <div className="takeaway-box mt-6">
                  <strong>Key Takeaway:</strong> {(selectedContent as any).keyTakeaway}
                </div>
              </div>
            )}

            {state.initialLearningMode === "visual" && (
              <div className="visual-mode-layout">
                <h3 className="recovery-content-title">{(selectedContent as any).title}</h3>

                <div className="visual-steps-flow mt-6" aria-hidden="true">
                  {(selectedContent as any).steps.map((step: any, idx: number) => (
                    <div key={idx} className="visual-flow-step">
                      <div className="flow-step-box">
                        <div className="flow-step-label">{step.label}</div>
                        <div className="flow-step-value">{step.value}</div>
                        <div className="flow-step-desc">{step.explanation}</div>
                      </div>
                      {idx < (selectedContent as any).steps.length - 1 && (
                        <div className="flow-arrow-down" aria-hidden="true">↓</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="accessible-description-section mt-6 p-4 border rounded bg-slate-50">
                  <h4 className="font-bold">📝 Educational Description:</h4>
                  <p className="accessible-description-text mt-2">{(selectedContent as any).accessibleExplanation}</p>
                </div>

                <div className="takeaway-box mt-6">
                  <strong>Key Takeaway:</strong> {(selectedContent as any).keyTakeaway}
                </div>
              </div>
            )}

            {state.initialLearningMode === "memory" && (
              <div className="memory-mode-layout">
                <h3 className="recovery-content-title">Memory Shortcut</h3>
                
                <div className="mnemonic-hook-card mt-4">
                  <span className="hook-prefix font-bold">Mnemonic Hook:</span>
                  <div className="hook-value font-mono font-bold text-xl text-accent-violet">{(selectedContent as any).hook}</div>
                </div>

                <div className="memory-meaning-layout mt-6">
                  <h4 className="font-bold">🔍 What it stands for:</h4>
                  <p className="meaning-text mt-2">{(selectedContent as any).meaning}</p>
                </div>

                <div className="memory-example-layout mt-6">
                  <h4 className="font-bold">💻 Code / Context Example:</h4>
                  <pre className="code-block mt-2">
                    <code>{(selectedContent as any).example}</code>
                  </pre>
                </div>

                <div className="takeaway-box mt-6">
                  <strong>Key Takeaway:</strong> {(selectedContent as any).keyTakeaway}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary mt-8"
              onClick={() => dispatch({ type: "TRY_INITIAL_CONTENT" })}
            >
              Try It
            </button>
          </div>
        )}

        {/* Stage 3: Practice Question Card */}
        {state.phase === "practice" && state.lesson && (
          <QuestionCard
            currentAttemptCount={state.concepts[state.lesson.initialQuestion.conceptId]?.attempts || 0}
            recentOutcome={state.concepts[state.lesson.initialQuestion.conceptId]?.recentOutcome || null}
            question={state.lesson.initialQuestion}
            onSubmitAnswer={(payload) => dispatch({ type: "SUBMIT_PRACTICE_ANSWER", payload })}
            onContinue={() => dispatch({ type: "START_MISSION" })}
            onHelpRequest={() => dispatch({ type: "REQUEST_HELP" })}
            lang={state.learningLanguage}
          />
        )}

        {/* Stage 4a: Diagnosis Struggle Detected */}
        {state.phase === "recoveryDiagnosis" && state.lesson && (
          <div className="learning-card recovery-diagnosis-pending">
            <div className="card-header recovery-header">
              <span className="card-badge recovery-badge">Struggle Detected</span>
            </div>
            <h3 className="recovery-title">Let's try a different way.</h3>
            <p className="recovery-desc mt-2 text-sm">
              That approach doesn't seem to be clicking yet. Based on your answers, another explanation may work better.
            </p>
            
            {state.recovery.diagnosisStatus === "loading" ? (
              <div className="status-loading-spinner mt-6" role="status" aria-live="polite">
                <p className="loading-text">Understanding where you're stuck…</p>
              </div>
            ) : state.recovery.diagnosisStatus === "error" ? (
              <div className="error-alert mt-6" role="alert">
                <p className="error-msg">
                  ⚠️ We couldn't diagnose your misconception right now. Your progress is saved.
                </p>
                {apiError && <p className="error-detail text-sm mt-1">{apiError}</p>}
                <button 
                  type="button" 
                  className="btn btn-primary mt-4" 
                  onClick={() => dispatch({ type: "REQUEST_HELP" })}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <p className="recovery-desc mt-4">
                Analyzing initial learning mode preference ({state.initialLearningMode}) and response mistakes...
              </p>
            )}

            {import.meta.env.DEV && (
              <div className="dev-banner mt-6">
                <p><strong>Dev Mocks:</strong> diagnosis bypass</p>
                <div className="button-group dev-buttons mt-2">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockDiagnosis("story")}
                  >
                    Mock Diagnose "Story"
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockDiagnosis("visual")}
                  >
                    Mock Diagnose "Visual"
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockDiagnosis("memory")}
                  >
                    Mock Diagnose "Memory"
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 4b: Recovery Mode Selection */}
        {state.phase === "recoverySelection" && (
          <div className="learning-card">
            {apiError && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Failed to generate custom recovery: {apiError}</p>
              </div>
            )}

            <RecoveryMode
              recommendedMode={state.recovery.recommendedMode}
              selectedMode={state.recovery.selectedMode}
              isLoading={state.recovery.contentStatus === "loading"}
              onSelectMode={handleSelectMode}
              misconception={state.recovery.misconception}
            />

            {import.meta.env.DEV && (
              <div className="dev-banner mt-6">
                <p><strong>Dev Mocks:</strong> explanation bypass</p>
                <div className="button-group dev-buttons mt-2">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockRecoveryContent("story")}
                  >
                    Mock Story Content
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockRecoveryContent("visual")}
                  >
                    Mock Visual Content
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleMockRecoveryContent("memory")}
                  >
                    Mock Memory Content
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 4c: Recovery Content View */}
        {state.phase === "recoveryContent" && (
          <div className="learning-card">
            {state.recovery.contentStatus === "loading" ? (
              <div className="status-loading-spinner" role="status" aria-live="polite">
                <p className="loading-text">Creating a different explanation…</p>
              </div>
            ) : (
              <RecoveryContent
                content={state.recovery.recoveryContent}
                onContinueToRetest={() => dispatch({ type: "START_RETEST" })}
                lang={state.learningLanguage}
              />
            )}
          </div>
        )}

        {/* Stage 4d: Recovery Re-test */}
        {state.phase === "retest" && (
          <div className="learning-card retest-stage">
            <div className="card-header recovery-header">
              <span className="card-badge recovery-badge">Recovery Verification</span>
              <ListenButton text={getRetestSpeech()} lang={state.learningLanguage} />
              {state.recovery.recovered === false && (
                <span className="retest-status-badge fail">Retest Failed</span>
              )}
            </div>

            <h3 className="retest-title">{retestQuestionText}</h3>
            <p className="retest-desc">
              Solve this related question to verify your understanding.
            </p>

            {!retestSubmitted ? (
              <form onSubmit={handleRetestSubmit} className="retest-form mt-4">
                <fieldset className="options-fieldset">
                  <legend className="sr-only">Choose one answer option</legend>
                  <div className="options-list">
                    {retestOptionsList.map((option: string) => (
                      <label 
                        key={option} 
                        className={`option-label ${selectedRetestOption === option ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="retest-option"
                          value={option}
                          checked={selectedRetestOption === option}
                          onChange={(e) => setSelectedRetestOption(e.target.value)}
                          className="sr-only"
                        />
                        <span className="custom-radio" aria-hidden="true" />
                        <span className="option-text">{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button 
                  type="submit" 
                  className="btn btn-primary mt-6" 
                  disabled={!selectedRetestOption}
                >
                  Submit Re-test
                </button>
              </form>
            ) : (
              <div className="feedback-section" role="status" aria-live="polite">
                {state.recovery.recovered ? (
                  <div className="feedback-correct">
                    <p className="feedback-msg">✓ Excellent! You successfully recovered the concept.</p>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => {
                        dispatch({ type: "START_MISSION" });
                        handleRetestReset();
                      }}
                    >
                      Advance to Mission
                    </button>
                  </div>
                ) : (
                  <div className="feedback-incorrect">
                    <p className="feedback-msg">
                      Not quite. That answer was incorrect.
                    </p>
                    <div className="button-group">
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleRetestReset}
                      >
                        Try Retest Again
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          dispatch({ type: "START_MISSION" });
                          handleRetestReset();
                        }}
                      >
                        Continue to Mission (Skip Retest)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage 5: Apply Mission */}
        {state.phase === "mission" && state.lesson && (
          <div>
            {state.mission.evaluationStatus === "error" && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Evaluation failed: {apiError || "Unable to contact evaluation service."}</p>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm mt-2" 
                  onClick={handleEvaluateMission}
                >
                  Retry Evaluation
                </button>
              </div>
            )}

            <MissionCard
              missionState={state.mission}
              mission={state.lesson.mission}
              onSaveSubmission={(submission) => dispatch({ type: "SET_MISSION_SUBMISSION", payload: { submission } })}
              onUseHint={() => dispatch({ type: "SET_HINT_USED" })}
              onSubmitMission={handleEvaluateMission}
              onDevelopmentMockEvaluation={(passed) => {
                dispatch({
                  type: "SET_MISSION_RESULT",
                  payload: {
                    passed,
                    feedback: passed 
                      ? "Excellent work! Your submission successfully meets the grading criteria." 
                      : "The solution was close, but didn't completely cover all required rubric checks.",
                    weakness: null,
                  },
                });
              }}
              lang={state.learningLanguage}
            />
          </div>
        )}

        {/* Stage 5b: Mission Result */}
        {state.phase === "missionResult" && (
          <div className="learning-card mission-result-card">
            <div className="card-header mission-header">
              <span className="card-badge mission-badge">Mission Evaluation</span>
            </div>

            <h3 className="mission-title">Mission Results</h3>

            <div className="evaluation-box mt-4" role="status" aria-live="polite">
              {state.mission.passed ? (
                <div className="eval-status pass">✓ MISSION PASSED</div>
              ) : (
                <div className="eval-status fail">✗ MISSION FAILED</div>
              )}

              <p className="eval-feedback"><strong>Feedback:</strong> {state.mission.feedback}</p>
              
              {state.mission.weakness && state.concepts[state.mission.weakness] && (
                <p className="eval-weakness text-danger">
                  <strong>Concept Focus Required:</strong> {state.concepts[state.mission.weakness].name}
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary mt-6"
              onClick={handleGetNextAction}
            >
              Determine Next Step
            </button>
          </div>
        )}

        {/* Stage 6: Next Best Action Recommendation */}
        {state.phase === "nextAction" && (
          <div>
            {apiError && (
              <div className="error-alert mb-4" role="alert">
                <p className="error-msg">⚠️ Failed to determine next step: {apiError}</p>
                <button type="button" className="btn btn-primary btn-sm mt-2" onClick={handleGetNextAction}>
                  Retry Action Gen
                </button>
              </div>
            )}

            <NextActionCard
              nextAction={state.nextAction}
              onReset={() => dispatch({ type: "RESET_LEARNING_SESSION" })}
              onDevelopmentMockNextAction={(action) => {
                dispatch({
                  type: "SET_NEXT_ACTION",
                  payload: { nextAction: action },
                });
              }}
              lang={state.learningLanguage}
            />
          </div>
        )}
      </main>

      {/* Global screen reader polite phase announcer */}
      <div className="sr-only" role="status" aria-live="polite">
        Current phase: {state.phase}. {state.lesson ? `Mastery level is ${state.concepts[state.currentConcept]?.mastery || 0}% for ${state.concepts[state.currentConcept]?.name || state.currentConcept}.` : ""}
      </div>
    </div>
  );
}

export default App;

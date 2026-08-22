import { useState } from "react";
import type { ConceptId } from "../state/learnerTypes";
import ListenButton from "./ListenButton";

interface QuestionCardProps {
  currentAttemptCount: number;
  recentOutcome: "correct" | "incorrect" | null;
  question: {
    id: string;
    conceptId: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    retryHint: string;
  };
  onSubmitAnswer: (payload: { questionId: string; concept: ConceptId; answer: string; correct: boolean }) => void;
  onContinue: () => void;
  onHelpRequest: () => void;
}

export default function QuestionCard({
  currentAttemptCount,
  recentOutcome,
  question,
  onSubmitAnswer,
  onContinue,
  onHelpRequest,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    const isCorrect = selectedOption === question.correctAnswer;
    onSubmitAnswer({
      questionId: question.id,
      concept: question.conceptId,
      answer: selectedOption,
      correct: isCorrect,
    });
    setSubmitted(true);
  };

  const handleRetry = () => {
    setSelectedOption("");
    setSubmitted(false);
  };

  const speechText = `${question.prompt}. Options are: ${question.options.join(", ")}.`;

  return (
    <div className="learning-card">
      <div className="card-header">
        <div className="header-badges">
          <span className="card-badge">Concept Practice</span>
          <span className="attempts-badge">Attempts: {currentAttemptCount}</span>
        </div>
        <ListenButton text={speechText} />
      </div>

      <h3 className="question-title">{question.prompt}</h3>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="practice-form">
          <fieldset className="options-fieldset">
            <legend className="sr-only">Choose one answer option</legend>
            <div className="options-list">
              {question.options.map((option) => (
                <label 
                  key={option} 
                  className={`option-label ${selectedOption === option ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="answer-option"
                    value={option}
                    checked={selectedOption === option}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="sr-only"
                  />
                  <span className="custom-radio" aria-hidden="true" />
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!selectedOption}
            >
              Submit Answer
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onHelpRequest}
            >
              I need help
            </button>
          </div>
        </form>
      ) : (
        <div className="feedback-section" role="status" aria-live="polite">
          {recentOutcome === "correct" ? (
            <div className="feedback-correct">
              <div className="feedback-header">
                <p className="feedback-msg">✓ Correct — concept understood.</p>
                <ListenButton text="Correct — concept understood." />
              </div>
              <button 
                type="button" 
                className="btn btn-primary mt-4" 
                onClick={onContinue}
              >
                Continue to Mission
              </button>
            </div>
          ) : (
            <div className="feedback-incorrect">
              <div className="feedback-header">
                <p className="feedback-msg">
                  Incorrect — try again. Hint: {question.retryHint}
                </p>
                <ListenButton text={`Incorrect — try again. Hint: ${question.retryHint}`} />
              </div>
              <div className="button-group mt-4">
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleRetry}
                >
                  Try Again
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onHelpRequest}
                >
                  Request Recovery Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
